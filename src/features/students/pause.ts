import type { StudentStatus } from "@/generated/prisma/client";

/**
 * How long a student stays paused before they are worth archiving.
 *
 * A month, in DARPE's words. Thirty days rather than a calendar month because
 * the rule is "long enough that they are not coming back this course", and a
 * calendar month would make February's pause shorter than January's for no
 * reason anyone could explain to staff.
 */
export const PAUSE_ARCHIVE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The `pausedAt` a status change should write, or `undefined` to leave it be.
 *
 * Three cases, and the third is the one that matters: a student who was already
 * paused and is saved again keeps their original pause date, so editing their
 * phone number does not quietly restart their month.
 */
export function pausedAtForChange(
  previous: StudentStatus,
  next: StudentStatus,
  now: Date
): Date | null | undefined {
  if (next === "PAUSED") {
    return previous === "PAUSED" ? undefined : now;
  }

  // Leaving PAUSED — including straight to ARCHIVED — clears the date, because
  // it only ever means "paused since".
  return previous === "PAUSED" ? null : undefined;
}

/**
 * Whether a paused student has been paused long enough to archive.
 *
 * Deliberately a question, not an action. Archiving is how a student leaves the
 * daily lists, and doing it behind the staff's back — on a page load, from a
 * background job nobody can see — would mean people vanish for reasons no one
 * in the office could explain. The list asks this, then offers the archive.
 *
 * A paused student with no recorded date is never archivable: the pause predates
 * the field, and guessing when it began would archive somebody on invented
 * evidence.
 */
export function isArchivableFromPause(
  status: StudentStatus,
  pausedAt: Date | null,
  now: Date
): boolean {
  if (status !== "PAUSED" || !pausedAt) return false;

  return now.getTime() - pausedAt.getTime() >= PAUSE_ARCHIVE_DAYS * DAY_MS;
}

/** Whole days a student has been paused, for the prompt staff read. */
export function daysPaused(pausedAt: Date, now: Date): number {
  return Math.floor((now.getTime() - pausedAt.getTime()) / DAY_MS);
}
