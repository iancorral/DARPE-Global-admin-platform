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
import { TEACHER_OCCUPYING_STATUSES } from "@/features/sessions/lifecycle";
import { firstValidationMessage } from "@/features/sessions/schemas";
import {
  inSchedulingTransaction,
  type ActionResult,
} from "@/features/sessions/transaction";
import { expandSlotsForDates, expandSlotsForMonth, occurrenceKey } from "./generation";
import {
  buildWeeklySeries,
  planWeeklySeries,
  seriesConflictMessage,
  seriesSessionRecords,
  weeklyOccurrenceDates,
  type SeriesOccurrence,
} from "./series";
import {
  generateMonthSchema,
  scheduleSlotSchema,
  weeklySeriesSchema,
  type GenerateMonthInput,
  type ScheduleSlotInput,
  type WeeklySeriesInput,
} from "./schemas";
import type { Prisma } from "@/generated/prisma/client";

export type { ActionResult };

export type GenerationConflict = {
  studentName: string;
  teacherName: string;
  date: string;
  startLabel: string;
};

export type GenerateResult =
  | { success: true; created: number; skipped: number; conflicts: GenerationConflict[] }
  | { success: false; error: string };

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

  const slot = await db.scheduleSlot.update({
    where: { id },
    data: { active: false },
  });

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
 */
async function findTeacherOccupancy(
  client: Prisma.TransactionClient,
  teacherId: string,
  candidates: SeriesOccurrence[],
  dates: string[]
): Promise<TeacherTimeRange[]> {
  const windowStart = Math.min(...candidates.map((candidate) => candidate.startsAt.getTime()));
  const windowEnd = Math.max(...candidates.map((candidate) => endOf(candidate).getTime()));
  const firstDate = dates[0] ?? "";
  const lastDate = dates[dates.length - 1] ?? firstDate;

  const [sessions, slots] = await Promise.all([
    client.classSession.findMany({
      where: {
        teacherId,
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

  const result = await inSchedulingTransaction(async (tx) => {
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
