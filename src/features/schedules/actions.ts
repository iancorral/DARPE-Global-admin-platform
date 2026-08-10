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
} from "@/features/sessions/conflicts";
import { expandSlotsForMonth, occurrenceKey } from "./generation";
import {
  generateMonthSchema,
  scheduleSlotSchema,
  type GenerateMonthInput,
  type ScheduleSlotInput,
} from "./schemas";

export type ActionResult = { success: true } | { success: false; error: string };

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
    return { success: false, error: "Please check the form and try again." };
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
      student: { status: { in: ["ACTIVE", "TRIAL"] } },
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
      status: { not: "CANCELLED" },
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
