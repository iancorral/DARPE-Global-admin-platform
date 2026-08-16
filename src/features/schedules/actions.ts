"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  DEFAULT_TIMEZONE,
  datesInMonth,
  formatDateOnly,
  formatInZone,
  parseDateOnly,
} from "@/lib/datetime";
import {
  CONFLICT_LOOKBACK_MINUTES,
  partitionByTeacherAvailability,
  endOf,
  type TeacherTimeRange,
} from "@/features/sessions/conflicts";
import {
  ELIGIBLE_STUDENT_STATUSES,
  checkManualClassEligibility,
} from "@/features/sessions/eligibility";
import { TEACHER_OCCUPYING_STATUSES, canEditScheduling } from "@/features/sessions/lifecycle";
import { firstValidationMessage } from "@/features/sessions/schemas";
import {
  inSchedulingTransaction,
  type ActionResult,
} from "@/features/sessions/transaction";
import { expandSlotsForDates, expandSlotsForMonth, occurrenceKey } from "./generation";
import {
  planSeriesEnd,
  planSeriesSplit,
  type OldSlotChange,
} from "./series-edit";
import {
  buildWeeklySeries,
  planWeeklySeries,
  seriesConflictMessage,
  seriesSessionRecords,
  weeklyOccurrenceDates,
  type SeriesOccurrence,
} from "./series";
import {
  endSeriesSchema,
  generateMonthSchema,
  scheduleSlotSchema,
  updateSeriesSchema,
  weeklySeriesSchema,
  type EndSeriesInput,
  type GenerateMonthInput,
  type ScheduleSlotInput,
  type UpdateSeriesInput,
  type WeeklySeriesInput,
} from "./schemas";
import { Prisma } from "@/generated/prisma/client";
import type {
  GenerateResult,
  GenerationConflict,
  SeriesEndResult,
  SeriesUpdateResult,
} from "./action-results";

export async function createScheduleSlot(input: ScheduleSlotInput): Promise<ActionResult> {
  await requireUser();

  const parsed = scheduleSlotSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstValidationMessage(parsed.error, "Please check the form and try again."),
    };
  }

  const { studentId, teacherId, weekday, startTime, durationMinutes } = parsed.data;
  const startsOn = parseDateOnly(parsed.data.startsOn);
  const endsOn = parsed.data.endsOn ? parseDateOnly(parsed.data.endsOn) : null;

  const conflict = await db.scheduleSlot.findFirst({
    where: {
      teacherId,
      weekday,
      startTime,
      active: true,
      OR: [{ endsOn: null }, { endsOn: { gte: startsOn } }],
      ...(endsOn && { startsOn: { lte: endsOn } }),
    },
  });

  if (conflict) {
    return { success: false, error: "This teacher already has a class at that time." };
  }

  await db.scheduleSlot.create({
    data: { studentId, teacherId, weekday, startTime, durationMinutes, startsOn, endsOn },
  });

  revalidatePath(`/students/${studentId}`);
  return { success: true };
}

export async function deactivateScheduleSlot(id: string): Promise<ActionResult> {
  await requireUser();

  if (typeof id !== "string" || id.length === 0) {
    return { success: false, error: "Select a schedule slot to remove." };
  }

  let slot;
  try {
    slot = await db.scheduleSlot.update({
      where: { id },
      data: { active: false },
    });
  } catch (error) {
    // P2025: the row is already gone, likely removed from another tab or device.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, error: "That schedule slot no longer exists." };
    }
    throw error;
  }

  revalidatePath(`/students/${slot.studentId}`);
  return { success: true };
}

/**
 * When this teacher is already booked over the days a new series would land on.
 *
 * Two different things can occupy a teacher, and both have to count:
 *
 * 1. Classes that exist. Cancelled ones are left out, because they free the time.
 * 2. Recurring patterns that will produce classes. A slot generated no further
 *    than last month still means its student's Tuesday belongs to them, and
 *    booking over it would only surface next time somebody generates a month.
 *
 * A pattern whose class for that date already exists is dropped from the second
 * list: the real record is the authority, and it may since have been moved or
 * cancelled. Counting the pattern as well would block the time a rescheduled class
 * has just left.
 *
 * Runs on the caller's transaction client, so the availability it reports and the
 * write it authorises cannot be separated by another coordinator's booking.
 *
 * `exclude` is what the caller is about to replace, and must not block itself: the
 * recurring rule whose future segment is being rewritten, and the concrete classes
 * being moved or cancelled by the same edit. Everything else still counts.
 */
async function findTeacherOccupancy(
  client: Prisma.TransactionClient,
  teacherId: string,
  candidates: SeriesOccurrence[],
  dates: string[],
  exclude: { slotId?: string; sessionIds?: string[] } = {}
): Promise<TeacherTimeRange[]> {
  const windowStart = Math.min(...candidates.map((candidate) => candidate.startsAt.getTime()));
  const windowEnd = Math.max(...candidates.map((candidate) => endOf(candidate).getTime()));
  const firstDate = dates[0] ?? "";
  const lastDate = dates[dates.length - 1] ?? firstDate;

  const [sessions, slots] = await Promise.all([
    client.classSession.findMany({
      where: {
        teacherId,
        ...(exclude.sessionIds?.length && { id: { notIn: exclude.sessionIds } }),
        status: { in: TEACHER_OCCUPYING_STATUSES },
        startsAt: {
          gte: new Date(windowStart - CONFLICT_LOOKBACK_MINUTES * 60_000),
          lt: new Date(windowEnd),
        },
      },
      select: { startsAt: true, durationMinutes: true },
    }),
    // The same population monthly generation would expand: active patterns, active
    // teacher, and a student who may still be given classes.
    client.scheduleSlot.findMany({
      where: {
        teacherId,
        ...(exclude.slotId && { id: { not: exclude.slotId } }),
        active: true,
        student: { status: { in: ELIGIBLE_STUDENT_STATUSES } },
        startsOn: { lte: parseDateOnly(lastDate) },
        OR: [{ endsOn: null }, { endsOn: { gte: parseDateOnly(firstDate) } }],
      },
      select: {
        id: true,
        weekday: true,
        startTime: true,
        durationMinutes: true,
        startsOn: true,
        endsOn: true,
        teacherId: true,
        student: { select: { id: true, languageId: true } },
      },
    }),
  ]);

  const implied = expandSlotsForDates(slots, dates);

  const generated =
    implied.length === 0
      ? []
      : await client.classSession.findMany({
          where: {
            scheduleSlotId: { in: [...new Set(implied.map((o) => o.scheduleSlotId))] },
            slotOccurrenceOn: { in: dates.map(parseDateOnly) },
          },
          select: { scheduleSlotId: true, slotOccurrenceOn: true },
        });

  const alreadyGenerated = new Set(
    generated.flatMap((session) =>
      session.scheduleSlotId && session.slotOccurrenceOn
        ? [occurrenceKey(session.scheduleSlotId, formatDateOnly(session.slotOccurrenceOn))]
        : []
    )
  );

  return [
    ...sessions.map((session) => ({
      teacherId,
      startsAt: session.startsAt,
      durationMinutes: session.durationMinutes,
    })),
    ...implied
      .filter(
        (occurrence) =>
          !alreadyGenerated.has(
            occurrenceKey(occurrence.scheduleSlotId, occurrence.occurrenceOn)
          )
      )
      .map((occurrence) => ({
        teacherId,
        startsAt: occurrence.startsAt,
        durationMinutes: occurrence.durationMinutes,
      })),
  ];
}

/**
 * Creates a finite weekly series from a calendar position: the recurring pattern
 * and every class it implies, in one step.
 *
 * The client sends a range, not a series. The weekday, the occurrence dates, the
 * language and the eligibility of everyone involved are all worked out here from
 * the records themselves, so the only thing the calendar decides is when and who.
 *
 * All or nothing. Every week is checked against the teacher's existing classes,
 * their other recurring patterns and the rest of this series, and a single clash
 * refuses the whole thing with the dates that clash. A half-created series is
 * worse than none: staff would have no way to tell which weeks the student
 * actually has.
 *
 * The classes are written here rather than left for monthly generation, so the
 * series appears in every affected week immediately.
 */
export async function createWeeklySeries(input: WeeklySeriesInput): Promise<ActionResult> {
  await requireUser();

  const parsed = weeklySeriesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstValidationMessage(parsed.error, "Please check the form and try again."),
    };
  }

  const { studentId, teacherId, startsOn, endsOn, startTime, durationMinutes } = parsed.data;

  // Expanded from the validated range, never taken from the client: whatever the
  // dialog previewed, this is the series that gets booked.
  const dates = weeklyOccurrenceDates(startsOn, endsOn);
  if (dates.length === 0) {
    return { success: false, error: "That date range contains no classes." };
  }

  const result = await inSchedulingTransaction<ActionResult>(async (tx) => {
    const [student, teacher] = await Promise.all([
      tx.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          languageId: true,
          language: { select: { name: true } },
        },
      }),
      tx.teacher.findUnique({
        where: { id: teacherId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          active: true,
          languages: { select: { languageId: true } },
        },
      }),
    ]);

    if (!student) {
      return { success: false, error: "That student no longer exists." };
    }

    if (!teacher) {
      return { success: false, error: "That teacher no longer exists." };
    }

    // The same rule a single class goes through: an active or trial student, and
    // an active teacher who teaches their language.
    const eligibility = checkManualClassEligibility({
      student: {
        name: `${student.firstName} ${student.lastName}`,
        status: student.status,
        languageId: student.languageId,
      },
      teacher: {
        name: `${teacher.firstName} ${teacher.lastName}`,
        active: teacher.active,
        languageIds: teacher.languages.map((entry) => entry.languageId),
      },
      languageName: student.language.name,
    });

    if (!eligibility.ok) {
      return { success: false, error: eligibility.error };
    }

    const draft = buildWeeklySeries({
      startsOn,
      endsOn,
      startTime,
      durationMinutes,
      teacherId: teacher.id,
      student: { id: student.id, languageId: student.languageId },
    });

    const occupied = await findTeacherOccupancy(tx, teacher.id, draft.occurrences, dates);
    const plan = planWeeklySeries(draft.occurrences, occupied);

    if (!plan.ok) {
      return {
        success: false,
        error: seriesConflictMessage(
          teacher.firstName,
          plan.conflicts.map(
            (conflict) =>
              `${formatInZone(conflict.startsAt, DEFAULT_TIMEZONE, "MMM d")} at ` +
              `${formatInZone(conflict.startsAt, DEFAULT_TIMEZONE)}`
          )
        ),
      };
    }

    const slot = await tx.scheduleSlot.create({ data: draft.slot, select: { id: true } });

    const sessions = await tx.classSession.createManyAndReturn({
      data: seriesSessionRecords(slot.id, plan.occurrences),
      select: { id: true },
    });

    await tx.classParticipant.createMany({
      data: sessions.map((session) => ({
        classSessionId: session.id,
        studentId: student.id,
      })),
    });

    return { success: true };
  });

  if (!result.success) {
    return result;
  }

  revalidatePath("/calendar");
  revalidatePath(`/students/${studentId}`);
  return { success: true };
}

/**
 * Creates the ClassSession records implied by every active slot for one month.
 * Re-running is safe: sessions that already exist are counted as skipped and
 * left untouched, so cancellations and manual edits survive regeneration.
 * Inactive teachers stop producing new sessions but keep the ones already generated.
 * Occurrences that would double-book a teacher are reported instead of created,
 * and the class already occupying that time is never modified.
 */
export async function generateMonthlySessions(
  input: GenerateMonthInput
): Promise<GenerateResult> {
  await requireUser();

  const parsed = generateMonthSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Select a valid month." };
  }

  const { year, month } = parsed.data;

  const slots = await db.scheduleSlot.findMany({
    where: {
      active: true,
      teacher: { active: true },
      student: { status: { in: ELIGIBLE_STUDENT_STATUSES } },
    },
    select: {
      id: true,
      weekday: true,
      startTime: true,
      durationMinutes: true,
      startsOn: true,
      endsOn: true,
      teacherId: true,
      teacher: { select: { firstName: true, lastName: true } },
      student: {
        select: { id: true, languageId: true, firstName: true, lastName: true },
      },
    },
  });

  const occurrences = expandSlotsForMonth(slots, year, month);
  if (occurrences.length === 0) {
    return { success: true, created: 0, skipped: 0, conflicts: [] };
  }

  // Matched on the occurrence date, not on startsAt, so sessions that were
  // rescheduled out of their original slot time are still counted as existing.
  const monthDates = datesInMonth(year, month);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = monthDates[monthDates.length - 1] ?? monthStart;
  const existing = await db.classSession.findMany({
    where: {
      scheduleSlotId: { in: slots.map((slot) => slot.id) },
      slotOccurrenceOn: {
        gte: parseDateOnly(monthStart),
        lte: parseDateOnly(monthEnd),
      },
    },
    select: { scheduleSlotId: true, slotOccurrenceOn: true },
  });

  const alreadyGenerated = new Set(
    existing.flatMap((session) =>
      session.scheduleSlotId && session.slotOccurrenceOn
        ? [occurrenceKey(session.scheduleSlotId, formatDateOnly(session.slotOccurrenceOn))]
        : []
    )
  );

  const pending = occurrences.filter(
    (occurrence) =>
      !alreadyGenerated.has(occurrenceKey(occurrence.scheduleSlotId, occurrence.occurrenceOn))
  );

  if (pending.length === 0) {
    return { success: true, created: 0, skipped: occurrences.length, conflicts: [] };
  }

  // A recurring slot must not double-book its teacher against a class that
  // already exists, so occupied time is loaded and the batch is filtered.
  const windowStart = pending.reduce(
    (earliest, occurrence) => Math.min(earliest, occurrence.startsAt.getTime()),
    Infinity
  );
  const windowEnd = pending.reduce(
    (latest, occurrence) =>
      Math.max(latest, occurrence.startsAt.getTime() + occurrence.durationMinutes * 60_000),
    -Infinity
  );

  const occupied = await db.classSession.findMany({
    where: {
      teacherId: { in: [...new Set(pending.map((occurrence) => occurrence.teacherId))] },
      status: { in: TEACHER_OCCUPYING_STATUSES },
      startsAt: {
        gte: new Date(windowStart - CONFLICT_LOOKBACK_MINUTES * 60_000),
        lt: new Date(windowEnd),
      },
    },
    select: { teacherId: true, startsAt: true, durationMinutes: true },
  });

  const { accepted, conflicted } = partitionByTeacherAvailability(pending, occupied);

  const slotLabels = new Map(
    slots.map((slot) => [
      slot.id,
      {
        studentName: `${slot.student.firstName} ${slot.student.lastName}`,
        teacherName: `${slot.teacher.firstName} ${slot.teacher.lastName}`,
      },
    ])
  );

  const conflicts: GenerationConflict[] = conflicted.map((occurrence) => ({
    studentName: slotLabels.get(occurrence.scheduleSlotId)?.studentName ?? "Unknown student",
    teacherName: slotLabels.get(occurrence.scheduleSlotId)?.teacherName ?? "Unknown teacher",
    date: occurrence.occurrenceOn,
    startLabel: formatInZone(occurrence.startsAt, DEFAULT_TIMEZONE),
  }));

  if (accepted.length === 0) {
    return {
      success: true,
      created: 0,
      skipped: occurrences.length - conflicts.length,
      conflicts,
    };
  }

  const studentByOccurrence = new Map(
    accepted.map((occurrence) => [
      occurrenceKey(occurrence.scheduleSlotId, occurrence.occurrenceOn),
      occurrence.studentId,
    ])
  );

  const created = await db.$transaction(async (tx) => {
    const sessions = await tx.classSession.createManyAndReturn({
      data: accepted.map((occurrence) => ({
        startsAt: occurrence.startsAt,
        durationMinutes: occurrence.durationMinutes,
        type: "INDIVIDUAL" as const,
        teacherId: occurrence.teacherId,
        languageId: occurrence.languageId,
        scheduleSlotId: occurrence.scheduleSlotId,
        slotOccurrenceOn: parseDateOnly(occurrence.occurrenceOn),
      })),
      select: { id: true, scheduleSlotId: true, slotOccurrenceOn: true },
      skipDuplicates: true,
    });

    const participants = sessions.flatMap((session) => {
      const studentId =
        session.scheduleSlotId && session.slotOccurrenceOn
          ? studentByOccurrence.get(
              occurrenceKey(session.scheduleSlotId, formatDateOnly(session.slotOccurrenceOn))
            )
          : undefined;
      return studentId ? [{ classSessionId: session.id, studentId }] : [];
    });

    await tx.classParticipant.createMany({ data: participants });

    return sessions.length;
  });

  revalidatePath("/calendar");
  return {
    success: true,
    created,
    skipped: occurrences.length - created - conflicts.length,
    conflicts,
  };
}

/**
 * The class a series edit was started from, with everything the edit must reason
 * about: its recurring rule, that rule's student, and the classes the rule has
 * already produced from the cutoff onward.
 *
 * The cutoff is the class's stored `slotOccurrenceOn` — the week it was generated
 * for. Its `startsAt` may have been moved to another day entirely, and moving a
 * class must not change which week of the series a later edit starts from.
 */
async function loadSeriesContext(client: Prisma.TransactionClient, sessionId: string) {
  const session = await client.classSession.findUnique({
    where: { id: sessionId },
    select: {
      status: true,
      slotOccurrenceOn: true,
      language: { select: { name: true } },
      scheduleSlot: {
        select: {
          id: true,
          startsOn: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              status: true,
              languageId: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return { ok: false as const, error: "That session no longer exists." };
  }

  if (!canEditScheduling(session.status)) {
    return {
      ok: false as const,
      error:
        session.status === "COMPLETED"
          ? "This class is already completed. Reopen it before changing the series."
          : "This class is cancelled. Restore it before changing the series.",
    };
  }

  if (!session.scheduleSlot || !session.slotOccurrenceOn) {
    return { ok: false as const, error: "This class is not part of a recurring series." };
  }

  const slot = session.scheduleSlot;
  const cutoffOn = formatDateOnly(session.slotOccurrenceOn);

  const futureRows = await client.classSession.findMany({
    where: {
      scheduleSlotId: slot.id,
      slotOccurrenceOn: { gte: parseDateOnly(cutoffOn) },
    },
    select: {
      id: true,
      status: true,
      slotOccurrenceOn: true,
      participants: { select: { id: true }, take: 1 },
    },
  });

  return {
    ok: true as const,
    cutoffOn,
    slot,
    student: slot.student,
    languageName: session.language.name,
    futureOccurrences: futureRows.flatMap((row) =>
      row.slotOccurrenceOn
        ? [
            {
              sessionId: row.id,
              occurrenceOn: formatDateOnly(row.slotOccurrenceOn),
              status: row.status,
              hasParticipant: row.participants.length > 0,
            },
          ]
        : []
    ),
  };
}

/** Ends the old recurring rule at the cutoff, or retires it if it never ran before. */
async function applyOldSlotChange(
  client: Prisma.TransactionClient,
  slotId: string,
  change: OldSlotChange
) {
  await client.scheduleSlot.update({
    where: { id: slotId },
    data:
      change.action === "deactivate"
        ? { active: false }
        : { endsOn: parseDateOnly(change.endsOn) },
  });
}

/**
 * Replaces a recurring series from one of its classes onward.
 *
 * The old rule is split rather than rewritten: it ends the day before the selected
 * class, and a new rule takes over from the submitted first date. Every earlier
 * week keeps the rule that produced it, so history still means what it meant.
 *
 * The classes the old rule already produced from the cutoff on are carried across
 * to the replacement dates in order, so a series that moves to another weekday
 * takes its classes with it. That overwrites individual reschedules made to those
 * future weeks, which is what this scope asks for and what the dialog says.
 *
 * All or nothing, inside one serializable transaction: a completed class in the
 * affected range, an ineligible student or teacher, or a single clash refuses the
 * whole edit and writes nothing.
 */
export async function updateSeriesFromSession(
  input: UpdateSeriesInput
): Promise<SeriesUpdateResult> {
  await requireUser();

  const parsed = updateSeriesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstValidationMessage(parsed.error, "Please check the form and try again."),
    };
  }

  const { id, teacherId, startsOn, endsOn, startTime, durationMinutes } = parsed.data;
  let studentId: string | null = null;

  const result = await inSchedulingTransaction<SeriesUpdateResult>(async (tx) => {
    const context = await loadSeriesContext(tx, id);
    if (!context.ok) {
      return { success: false, error: context.error };
    }

    const { cutoffOn, slot, student, languageName } = context;
    studentId = student.id;

    // The replacement takes over from the cutoff, so it cannot begin before it:
    // the old rule now ends the day before, and an earlier start would overlap the
    // history this split exists to leave alone.
    if (startsOn < cutoffOn) {
      return {
        success: false,
        error:
          `The new first class cannot be before ${cutoffOn}, the class you are ` +
          `changing from. Earlier classes are always left as they are.`,
      };
    }

    const teacher = await tx.teacher.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        active: true,
        languages: { select: { languageId: true } },
      },
    });

    if (!teacher) {
      return { success: false, error: "That teacher no longer exists." };
    }

    const eligibility = checkManualClassEligibility({
      student: {
        name: `${student.firstName} ${student.lastName}`,
        status: student.status,
        languageId: student.languageId,
      },
      teacher: {
        name: `${teacher.firstName} ${teacher.lastName}`,
        active: teacher.active,
        languageIds: teacher.languages.map((entry) => entry.languageId),
      },
      languageName,
    });

    if (!eligibility.ok) {
      return { success: false, error: eligibility.error };
    }

    const replacementDates = weeklyOccurrenceDates(startsOn, endsOn);
    const split = planSeriesSplit({
      cutoffOn,
      slotStartsOn: formatDateOnly(slot.startsOn),
      futureOccurrences: context.futureOccurrences,
      replacementDates,
    });

    if (!split.ok) {
      return { success: false, error: split.error };
    }

    const { plan } = split;

    const draft = buildWeeklySeries({
      startsOn,
      endsOn,
      startTime,
      durationMinutes,
      teacherId: teacher.id,
      student: { id: student.id, languageId: student.languageId },
    });

    // Only the weeks that will actually hold a class compete for the teacher's
    // time; a week carried across as cancelled occupies nobody.
    const occupiedDates = new Set(plan.occupiedDates);
    const candidates = draft.occurrences.filter((occurrence) =>
      occupiedDates.has(occurrence.occurrenceOn)
    );

    if (candidates.length > 0) {
      // The rule being replaced, and the classes this same edit is moving or
      // cancelling, must not block it. Everything else still counts.
      const affectedSessionIds = [
        ...plan.updates.map((update) => update.sessionId),
        ...plan.cancels.map((cancel) => cancel.sessionId),
      ];

      const occupied = await findTeacherOccupancy(
        tx,
        teacher.id,
        candidates,
        replacementDates,
        { slotId: slot.id, sessionIds: affectedSessionIds }
      );

      const booking = planWeeklySeries(candidates, occupied);
      if (!booking.ok) {
        return {
          success: false,
          error: seriesConflictMessage(
            teacher.firstName,
            booking.conflicts.map(
              (conflict) =>
                `${formatInZone(conflict.startsAt, DEFAULT_TIMEZONE, "MMM d")} at ` +
                `${formatInZone(conflict.startsAt, DEFAULT_TIMEZONE)}`
            )
          ),
        };
      }
    }

    const byDate = new Map(
      draft.occurrences.map((occurrence) => [occurrence.occurrenceOn, occurrence])
    );

    // Written in an order that cannot collide with the (slot, occurrence) unique
    // index: the replacement rule is brand new, so nothing already points at it,
    // and every date it receives is distinct.
    const replacement = await tx.scheduleSlot.create({
      data: draft.slot,
      select: { id: true },
    });

    for (const update of plan.updates) {
      const occurrence = byDate.get(update.occurrenceOn);
      if (!occurrence) continue;

      await tx.classSession.update({
        where: { id: update.sessionId },
        data: {
          startsAt: occurrence.startsAt,
          durationMinutes,
          teacherId: teacher.id,
          status: update.status,
          scheduleSlotId: replacement.id,
          slotOccurrenceOn: parseDateOnly(update.occurrenceOn),
        },
      });

      // Existing participant rows are left exactly as they are, attendance and
      // all; one is only added if a class somehow had none.
      if (update.needsParticipant) {
        await tx.classParticipant.create({
          data: { classSessionId: update.sessionId, studentId: student.id },
        });
      }
    }

    if (plan.creates.length > 0) {
      const created = await tx.classSession.createManyAndReturn({
        data: seriesSessionRecords(
          replacement.id,
          plan.creates.flatMap((create) => {
            const occurrence = byDate.get(create.occurrenceOn);
            return occurrence ? [occurrence] : [];
          })
        ),
        select: { id: true },
      });

      await tx.classParticipant.createMany({
        data: created.map((session) => ({
          classSessionId: session.id,
          studentId: student.id,
        })),
      });
    }

    if (plan.cancels.length > 0) {
      // Kept on the old rule and merely cancelled: nothing is deleted, and the
      // shortened rule no longer covers these dates, so generation leaves them be.
      await tx.classSession.updateMany({
        where: { id: { in: plan.cancels.map((cancel) => cancel.sessionId) } },
        data: { status: "CANCELLED" },
      });
    }

    await applyOldSlotChange(tx, slot.id, plan.oldSlot);

    return {
      success: true,
      updated: plan.updates.length,
      created: plan.creates.length,
      cancelled: plan.cancels.length,
    };
  });

  if (!result.success) {
    return result;
  }

  revalidatePath("/calendar");
  if (studentId) revalidatePath(`/students/${studentId}`);
  return result;
}

/**
 * Ends a recurring series from one of its classes onward.
 *
 * The rule stops the day before the selected class, and every still-scheduled
 * class from that week on is cancelled. Completed classes and already-cancelled
 * ones are untouched, and nothing is deleted — the series stops happening, it does
 * not stop having happened.
 */
export async function endSeriesFromSession(input: EndSeriesInput): Promise<SeriesEndResult> {
  await requireUser();

  const parsed = endSeriesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Select a class to end the series from." };
  }

  let studentId: string | null = null;

  const result = await inSchedulingTransaction<SeriesEndResult>(async (tx) => {
    const context = await loadSeriesContext(tx, parsed.data.id);
    if (!context.ok) {
      return { success: false, error: context.error };
    }

    const { cutoffOn, slot, student } = context;
    studentId = student.id;

    const plan = planSeriesEnd({
      cutoffOn,
      slotStartsOn: formatDateOnly(slot.startsOn),
      futureOccurrences: context.futureOccurrences,
    });

    if (plan.cancelSessionIds.length > 0) {
      await tx.classSession.updateMany({
        where: { id: { in: plan.cancelSessionIds } },
        data: { status: "CANCELLED" },
      });
    }

    await applyOldSlotChange(tx, slot.id, plan.oldSlot);

    return { success: true, cancelled: plan.cancelSessionIds.length };
  });

  if (!result.success) {
    return result;
  }

  revalidatePath("/calendar");
  if (studentId) revalidatePath(`/students/${studentId}`);
  return result;
}
