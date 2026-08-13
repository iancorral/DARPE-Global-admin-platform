"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DEFAULT_TIMEZONE, formatInZone, zonedToUtc } from "@/lib/datetime";
import { CONFLICT_LOOKBACK_MINUTES, endOf, findOverlap, type TimeRange } from "./conflicts";
import {
  TEACHER_OCCUPYING_STATUSES,
  canEditScheduling,
  canRecordAttendance,
  canTransition,
} from "./lifecycle";
import {
  completeSessionSchema,
  rescheduleSessionSchema,
  sessionStatusSchema,
  type CompleteSessionInput,
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
      status: { in: TEACHER_OCCUPYING_STATUSES },
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
 * Refuses the move when it would overlap another class for the same teacher, and
 * when the class is already completed or cancelled.
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
    select: { status: true, teacherId: true, teacher: { select: { firstName: true } } },
  });

  if (!session) {
    return { success: false, error: "That session no longer exists." };
  }

  if (!canEditScheduling(session.status)) {
    return {
      success: false,
      error:
        session.status === "COMPLETED"
          ? "This class is already completed. Reopen it before changing its time."
          : "This class is cancelled. Restore it before changing its time.",
    };
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
 * Cancels a session, or reopens a cancelled or completed one, without deleting
 * anything. Reopening re-occupies the teacher's time, so it is refused when
 * another active class has taken that slot in the meantime and the session keeps
 * the status it had.
 */
export async function setSessionStatus(input: SessionStatusInput): Promise<ActionResult> {
  await requireUser();

  const parsed = sessionStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "That status is not valid." };
  }

  const { id, status } = parsed.data;

  const session = await db.classSession.findUnique({
    where: { id },
    select: {
      status: true,
      teacherId: true,
      startsAt: true,
      durationMinutes: true,
      teacher: { select: { firstName: true } },
    },
  });

  if (!session) {
    return { success: false, error: "That session no longer exists." };
  }

  if (session.status === status) {
    return { success: true };
  }

  if (!canTransition(session.status, status)) {
    return {
      success: false,
      error: "This class is completed. Reopen it before cancelling it.",
    };
  }

  if (status === "SCHEDULED") {
    const conflict = await findTeacherConflict(session.teacherId, id, session);
    if (conflict) {
      return {
        success: false,
        error: `This class cannot be reopened. ${describeConflict(session.teacher.firstName, conflict)}`,
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

/**
 * Marks a class completed and stores each participant's attendance in one
 * transaction, so a class is never left completed with the attendance half saved.
 * Re-running it on an already completed class just corrects the attendance.
 *
 * The class keeps its time: completing it is a record of the class that happened,
 * never a scheduling change, so no conflict check is involved.
 */
export async function completeSession(input: CompleteSessionInput): Promise<ActionResult> {
  await requireUser();

  const parsed = completeSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the attendance and try again." };
  }

  const { id, attendance } = parsed.data;

  const session = await db.classSession.findUnique({
    where: { id },
    select: { status: true, participants: { select: { id: true } } },
  });

  if (!session) {
    return { success: false, error: "That session no longer exists." };
  }

  if (!canRecordAttendance(session.status)) {
    return {
      success: false,
      error: "A cancelled class cannot be completed. Restore it first.",
    };
  }

  // Participant ids arrive from the client, so they are only trusted after being
  // matched against the participants this session actually has.
  const ownParticipants = new Set(session.participants.map((participant) => participant.id));
  if (attendance.some((entry) => !ownParticipants.has(entry.participantId))) {
    return { success: false, error: "That attendance entry does not belong to this class." };
  }

  await db.$transaction(async (tx) => {
    for (const entry of attendance) {
      await tx.classParticipant.update({
        where: { id: entry.participantId },
        data: { attendance: entry.value },
      });
    }

    await tx.classSession.update({
      where: { id },
      data: { status: "COMPLETED" },
    });
  });

  revalidatePath("/calendar");
  return { success: true };
}
