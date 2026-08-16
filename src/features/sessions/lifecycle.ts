import type { ClassStatus } from "@/generated/prisma/client";

/**
 * Statuses that make a class occupy its teacher's time.
 *
 * A cancelled class frees the teacher; a completed one does not, because it
 * actually happened. Stated as an explicit list rather than "not cancelled" so a
 * future status cannot start blocking teachers by accident.
 */
export const TEACHER_OCCUPYING_STATUSES: ClassStatus[] = ["SCHEDULED", "COMPLETED"];

/**
 * The status changes staff can make from the calendar.
 *
 * COMPLETED and CANCELLED are records of what happened, so neither turns into
 * the other directly: the class has to be reopened to SCHEDULED first. That
 * keeps every change to a finished class a deliberate, visible step.
 */
const ALLOWED_TRANSITIONS: Record<ClassStatus, ClassStatus[]> = {
  SCHEDULED: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["SCHEDULED"],
  CANCELLED: ["SCHEDULED"],
};

export function canTransition(from: ClassStatus, to: ClassStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Whether a class's date, time or duration may still be edited.
 *
 * Only a scheduled class is still a plan. Moving a completed class would rewrite
 * history it already has attendance for, and moving a cancelled one would change
 * a record nobody is expecting to move, so both are locked until reopened.
 */
export function canEditScheduling(status: ClassStatus): boolean {
  return status === "SCHEDULED";
}

/**
 * Attendance belongs to a class that took place, so it can be recorded while
 * completing a scheduled class and corrected afterwards, but never on a
 * cancelled one.
 *
 * The list form exists so a guarded write can re-state the rule inside its own
 * WHERE clause — the check and the update become one atomic statement instead of
 * a read followed by a write a concurrent cancellation could slip between.
 */
export const ATTENDANCE_RECORDABLE_STATUSES: ClassStatus[] = ["SCHEDULED", "COMPLETED"];

export function canRecordAttendance(status: ClassStatus): boolean {
  return ATTENDANCE_RECORDABLE_STATUSES.includes(status);
}
