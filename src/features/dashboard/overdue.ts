/**
 * When a class starts asking to be dealt with.
 *
 * A class needs attention once it has *finished* and is still SCHEDULED: it
 * happened, or it did not, and either way the record no longer reflects
 * reality until somebody completes or cancels it.
 *
 * The rule is the end of the class, not the start of the day it falls on. A
 * class that ended two hours ago this morning is exactly as unresolved as one
 * from last week, and a class still running right now is not late at all — it
 * is in progress. Both cases were wrong while "before today" stood in for it.
 *
 * Pure, with `now` injected, so the boundary is testable without a clock.
 */

/**
 * How far back a class could have started and still be running.
 *
 * A window, not a truth: it lets the database answer "certainly finished" with
 * an indexed range on `startsAt` alone, since SQL cannot add a row's duration
 * to its own start in a WHERE clause. Anything that started earlier than this
 * has ended whatever its length; anything inside the window is fetched and
 * judged by `hasFullyEnded`. A full day is far beyond any real class, so the
 * window stays generous while the set it loads stays small.
 */
export const OVERDUE_WINDOW_MINUTES = 24 * 60;

/** The instant a class is over. */
export function classEndsAt(startsAt: Date, durationMinutes: number): Date {
  return new Date(startsAt.getTime() + durationMinutes * 60_000);
}

/**
 * Whether the class is over as of `now`. A class ending exactly now counts as
 * ended: its time is spent, and the next minute would only say so again.
 */
export function hasFullyEnded(
  session: { startsAt: Date; durationMinutes: number },
  now: Date
): boolean {
  return classEndsAt(session.startsAt, session.durationMinutes).getTime() <= now.getTime();
}

/**
 * The instant before which every class has certainly finished, whatever its
 * duration. Classes starting before this need no per-row check.
 */
export function certainlyEndedBefore(now: Date): Date {
  return new Date(now.getTime() - OVERDUE_WINDOW_MINUTES * 60_000);
}
