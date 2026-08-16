"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DEFAULT_TIMEZONE, formatInZone, zonedToUtc } from "@/lib/datetime";
import { CONFLICT_LOOKBACK_MINUTES, endOf, findOverlap, type TimeRange } from "./conflicts";
import {
  ATTENDANCE_RECORDABLE_STATUSES,
  TEACHER_OCCUPYING_STATUSES,
  canEditScheduling,
  canRecordAttendance,
  canTransition,
} from "./lifecycle";
import {
  buildManualSession,
  checkManualClassEligibility,
  checkTeacherForLanguage,
} from "./eligibility";
import { buildSchedulingUpdate, isStartTimeChangeAllowed } from "./scheduling";
import { inSchedulingTransaction, type ActionResult } from "./transaction";
import {
  ALIGNED_START_MESSAGE,
  completeSessionSchema,
  createSessionSchema,
  firstValidationMessage,
  sessionStatusSchema,
  updateSessionSchedulingSchema,
  type CompleteSessionInput,
  type CreateSessionInput,
  type SessionStatusInput,
  type UpdateSessionSchedulingInput,
} from "./schemas";
import { Prisma } from "@/generated/prisma/client";

/**
 * The first active session that would double-book this teacher. Cancelled classes
 * are ignored, so they never reserve a time. Overlap cannot be expressed as a
 * Prisma filter because a session's end is computed, so an indexed window is
 * narrowed here and the exact predicate is applied to the candidates.
 *
 * `excludeSessionId` is null when the session does not exist yet, as when a class
 * is being created; moving an existing one excludes itself.
 *
 * Takes the client to run on so callers can run it inside their transaction. That
 * is the point of the parameter: the check has to be part of the same transaction
 * as the write it guards, and there must still be only one definition of what a
 * conflict is.
 */
async function findTeacherConflict(
  client: Prisma.TransactionClient,
  teacherId: string,
  excludeSessionId: string | null,
  target: TimeRange
): Promise<TimeRange | null> {
  const candidates = await client.classSession.findMany({
    where: {
      teacherId,
      ...(excludeSessionId && { id: { not: excludeSessionId } }),
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
 * Creates a one-off individual class that belongs to no recurring schedule.
 *
 * Every id and eligibility rule is re-checked here against the database: the form
 * only narrows what staff can pick, it is never the authority on what is allowed.
 * The session and its participant are written in one transaction, so a class can
 * never exist without the student it was created for.
 */
export async function createSession(input: CreateSessionInput): Promise<ActionResult> {
  await requireUser();

  const parsed = createSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstValidationMessage(parsed.error, "Please check the form and try again."),
    };
  }

  const { studentId, teacherId, date, startTime, durationMinutes } = parsed.data;

  // Everything from here on runs in one serializable transaction: the eligibility
  // the decision rests on, the conflict check, and the write it authorises.
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

    const draft = buildManualSession({
      startsAt: zonedToUtc(date, startTime, DEFAULT_TIMEZONE),
      durationMinutes,
      teacherId: teacher.id,
      student: { id: student.id, languageId: student.languageId },
    });

    const conflict = await findTeacherConflict(tx, teacher.id, null, draft.session);
    if (conflict) {
      return { success: false, error: describeConflict(teacher.firstName, conflict) };
    }

    // Still one atomic pair: a class can never exist without its student.
    const session = await tx.classSession.create({
      data: draft.session,
      select: { id: true },
    });

    await tx.classParticipant.create({
      data: { classSessionId: session.id, studentId: draft.participant.studentId },
    });

    return { success: true };
  });

  if (!result.success) {
    return result;
  }

  revalidatePath("/calendar");
  return { success: true };
}

/**
 * Changes when a single session happens and who teaches it.
 *
 * Teacher, time and duration are validated as one final state: a class that moves
 * to a new teacher is checked for that teacher's availability at the new time, not
 * the old one's. Only this session changes — the recurring ScheduleSlot, its
 * teacher, and the student's primary teacher are all left alone, and
 * `slotOccurrenceOn` is preserved so regeneration still treats the occurrence as
 * done rather than recreating it at the original time.
 *
 * Refused when the class is completed or cancelled, and when the resulting state
 * would double-book the teacher.
 *
 * The start time must land on the scheduling interval unless it is the one the
 * class already has: a class stored at 08:15 can still have its teacher, date or
 * duration changed without being dragged onto the half hour, but any actual change
 * of time has to be aligned. The stored value is read back to decide that, never
 * taken from the client, and is never rewritten on its own.
 */
export async function updateSessionScheduling(
  input: UpdateSessionSchedulingInput
): Promise<ActionResult> {
  await requireUser();

  const parsed = updateSessionSchedulingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the form and try again." };
  }

  const { id, teacherId, date, startTime, durationMinutes } = parsed.data;

  const result = await inSchedulingTransaction<ActionResult>(async (tx) => {
    const session = await tx.classSession.findUnique({
      where: { id },
      select: {
        startsAt: true,
        status: true,
        languageId: true,
        language: { select: { name: true } },
      },
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

    const currentStartTime = formatInZone(session.startsAt, DEFAULT_TIMEZONE);
    if (!isStartTimeChangeAllowed(currentStartTime, startTime)) {
      return { success: false, error: ALIGNED_START_MESSAGE };
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

    const eligibility = checkTeacherForLanguage(
      {
        name: `${teacher.firstName} ${teacher.lastName}`,
        active: teacher.active,
        languageIds: teacher.languages.map((entry) => entry.languageId),
      },
      { id: session.languageId, name: session.language.name }
    );

    if (!eligibility.ok) {
      return { success: false, error: eligibility.error };
    }

    const update = buildSchedulingUpdate({
      startsAt: zonedToUtc(date, startTime, DEFAULT_TIMEZONE),
      durationMinutes,
      teacherId: teacher.id,
    });

    const conflict = await findTeacherConflict(tx, teacher.id, id, update);
    if (conflict) {
      return { success: false, error: describeConflict(teacher.firstName, conflict) };
    }

    await tx.classSession.update({ where: { id }, data: update });

    return { success: true };
  });

  if (!result.success) {
    return result;
  }

  revalidatePath("/calendar");
  return { success: true };
}

/**
 * Cancels a session, or reopens a cancelled or completed one, without deleting
 * anything. Reopening re-occupies the teacher's time, so it is refused when
 * another active class has taken that slot in the meantime and the session keeps
 * the status it had.
 *
 * Reopening is a booking, so it runs serializably like any other: its conflict
 * check and its write must not be separable by a class created in between.
 * Cancelling shares the transaction rather than branching around it — it only
 * frees time, so the isolation costs nothing.
 */
export async function setSessionStatus(input: SessionStatusInput): Promise<ActionResult> {
  await requireUser();

  const parsed = sessionStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "That status is not valid." };
  }

  const { id, status } = parsed.data;

  const result = await inSchedulingTransaction<ActionResult>(async (tx) => {
    const session = await tx.classSession.findUnique({
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
      const conflict = await findTeacherConflict(tx, session.teacherId, id, session);
      if (conflict) {
        return {
          success: false,
          error: `This class cannot be reopened. ${describeConflict(session.teacher.firstName, conflict)}`,
        };
      }
    }

    await tx.classSession.update({
      where: { id },
      data: { status },
    });

    return { success: true };
  });

  if (!result.success) {
    return result;
  }

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

  try {
    await db.$transaction(async (tx) => {
      for (const entry of attendance) {
        await tx.classParticipant.update({
          where: { id: entry.participantId },
          data: { attendance: entry.value },
        });
      }

      // The status filter re-states the rule checked above inside the write
      // itself, so a cancellation that lands between the check and this statement
      // rolls the whole completion back instead of being silently overwritten.
      const updated = await tx.classSession.updateMany({
        where: { id, status: { in: ATTENDANCE_RECORDABLE_STATUSES } },
        data: { status: "COMPLETED" },
      });

      if (updated.count === 0) {
        throw new CompletionBlockedError();
      }
    });
  } catch (error) {
    if (error instanceof CompletionBlockedError) {
      return {
        success: false,
        error: "This class was just cancelled by someone else. Restore it first.",
      };
    }
    throw error;
  }

  revalidatePath("/calendar");
  return { success: true };
}

/** Thrown inside the completion transaction to roll back the attendance writes. */
class CompletionBlockedError extends Error {
  constructor() {
    super("Class status changed while completing it.");
  }
}
