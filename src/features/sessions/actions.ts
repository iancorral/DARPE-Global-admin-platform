"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DEFAULT_TIMEZONE, formatInZone, zonedToUtc } from "@/lib/datetime";
import { CONFLICT_LOOKBACK_MINUTES, endOf, findOverlap, type TimeRange } from "./conflicts";
import {
  rescheduleSessionSchema,
  sessionStatusSchema,
  type RescheduleSessionInput,
  type SessionStatusInput,
} from "./schemas";

export type ActionResult = { success: true } | { success: false; error: string };

/**
 * The first active session that would double-book this teacher. Cancelled classes
 * are ignored, so they never reserve a time. Overlap cannot be expressed as a
 * Prisma filter because a session's end is computed, so an indexed window is
 * narrowed here and the exact predicate is applied to the candidates.
 */
async function findTeacherConflict(
  teacherId: string,
  excludeSessionId: string,
  target: TimeRange
): Promise<TimeRange | null> {
  const candidates = await db.classSession.findMany({
    where: {
      teacherId,
      id: { not: excludeSessionId },
      status: { not: "CANCELLED" },
      startsAt: {
        gte: new Date(target.startsAt.getTime() - CONFLICT_LOOKBACK_MINUTES * 60_000),
        lt: endOf(target),
      },
    },
    select: { startsAt: true, durationMinutes: true },
    orderBy: { startsAt: "asc" },
  });

  return findOverlap(target, candidates);
}

function describeConflict(teacherFirstName: string, conflict: TimeRange): string {
  const day = formatInZone(conflict.startsAt, DEFAULT_TIMEZONE, "MMM d");
  const from = formatInZone(conflict.startsAt, DEFAULT_TIMEZONE);
  const to = formatInZone(endOf(conflict), DEFAULT_TIMEZONE);

  return `${teacherFirstName} already has a class on ${day} from ${from} to ${to}.`;
}

/**
 * Moves a single session. The recurring ScheduleSlot is deliberately untouched,
 * and so is slotOccurrenceOn, so regeneration still treats this occurrence as done.
 * Refuses the move when it would overlap another class for the same teacher.
 */
export async function rescheduleSession(input: RescheduleSessionInput): Promise<ActionResult> {
  await requireUser();

  const parsed = rescheduleSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the form and try again." };
  }

  const { id, date, startTime, durationMinutes } = parsed.data;

  const session = await db.classSession.findUnique({
    where: { id },
    select: { teacherId: true, teacher: { select: { firstName: true } } },
  });

  if (!session) {
    return { success: false, error: "That session no longer exists." };
  }

  const target = {
    startsAt: zonedToUtc(date, startTime, DEFAULT_TIMEZONE),
    durationMinutes,
  };

  const conflict = await findTeacherConflict(session.teacherId, id, target);
  if (conflict) {
    return { success: false, error: describeConflict(session.teacher.firstName, conflict) };
  }

  await db.classSession.update({
    where: { id },
    data: { startsAt: target.startsAt, durationMinutes },
  });

  revalidatePath("/calendar");
  return { success: true };
}

/**
 * Cancels a session, or restores a cancelled one, without deleting anything.
 * Restoring re-occupies the teacher's time, so it is refused when another active
 * class has taken that slot in the meantime and the session stays cancelled.
 */
export async function setSessionStatus(input: SessionStatusInput): Promise<ActionResult> {
  await requireUser();

  const parsed = sessionStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "That status is not valid." };
  }

  const { id, status } = parsed.data;

  if (status === "SCHEDULED") {
    const session = await db.classSession.findUnique({
      where: { id },
      select: {
        teacherId: true,
        startsAt: true,
        durationMinutes: true,
        teacher: { select: { firstName: true } },
      },
    });

    if (!session) {
      return { success: false, error: "That session no longer exists." };
    }

    const conflict = await findTeacherConflict(session.teacherId, id, session);
    if (conflict) {
      return {
        success: false,
        error: `This class cannot be restored. ${describeConflict(session.teacher.firstName, conflict)}`,
      };
    }
  }

  await db.classSession.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/calendar");
  return { success: true };
}
