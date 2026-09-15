/**
 * Moving through the finance screen a month at a time.
 *
 * Money at DARPE is monthly: a course is one month, and revenue is counted on
 * the day it arrives. So the period a finance screen shows is a calendar month,
 * and the only navigation it needs is the month before and the month after.
 *
 * **Where the pager is allowed to stop is the interesting part**, and both ends
 * are deliberate:
 *
 * - **Forward stops at the current month**, because money received next month
 *   has not been received. The exception is a payment somebody dated into the
 *   future: hiding it because the calendar disagrees would lose real money from
 *   the totals, so the pager reaches as far as the furthest payment.
 * - **Back stops at the first month that holds a payment.** Before that there is
 *   nothing and never will be, and an endless corridor of empty months is only a
 *   way to get lost in one.
 *
 * With no payments at all there is nowhere to go, and the pager says so by
 * offering neither direction.
 *
 * Everything here is a pure string function over `YYYY-MM-01`, so none of it
 * needs a clock, a database or a timezone to be tested.
 */

/** First day of the month a YYYY-MM-DD date falls in. */
export function monthStartOf(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** The same day-one, `delta` months away. Negative goes back. */
export function shiftMonthStart(monthStart: string, delta: number): string {
  const year = Number(monthStart.slice(0, 4));
  const month = Number(monthStart.slice(5, 7));
  const zeroBased = year * 12 + (month - 1) + delta;

  // Floor division, so the arithmetic stays right either side of a year end.
  const shiftedYear = Math.floor(zeroBased / 12);
  const shiftedMonth = zeroBased - shiftedYear * 12 + 1;

  return `${String(shiftedYear).padStart(4, "0")}-${String(shiftedMonth).padStart(2, "0")}-01`;
}

/** `count` consecutive month starts ending at `monthStart`, oldest first. */
export function monthsEndingAt(monthStart: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    shiftMonthStart(monthStart, index - (count - 1))
  );
}

export type MonthNav = {
  /** The month before, or null when there is nothing earlier to show. */
  previous: string | null;
  /** The month after, or null when it has not happened yet. */
  next: string | null;
};

export function financeMonthNav({
  selected,
  currentMonthStart,
  earliestMonthStart,
  latestMonthStart,
}: {
  selected: string;
  currentMonthStart: string;
  /** Month of the first payment on record, or null when there are none. */
  earliestMonthStart: string | null;
  /** Month of the last payment on record, or null when there are none. */
  latestMonthStart: string | null;
}): MonthNav {
  if (!earliestMonthStart || !latestMonthStart) {
    return { previous: null, next: null };
  }

  const previous = shiftMonthStart(selected, -1);
  const next = shiftMonthStart(selected, 1);

  // A payment dated ahead of today extends the forward edge past this month,
  // so money that has been recorded can always be reached.
  const forwardEdge = latestMonthStart > currentMonthStart ? latestMonthStart : currentMonthStart;

  return {
    previous: previous >= earliestMonthStart ? previous : null,
    next: next <= forwardEdge ? next : null,
  };
}

/**
 * The month the screen should show, from `?month=YYYY-MM`.
 *
 * Anything unreadable falls back to the current month rather than erroring:
 * a mistyped address should still show the finance screen, just not a month
 * nobody asked for.
 */
export function selectedMonthStart(
  param: string | undefined,
  currentMonthStart: string
): string {
  if (!param || !/^\d{4}-(0[1-9]|1[0-2])$/.test(param)) return currentMonthStart;

  return `${param}-01`;
}

/** The `?month=` value for a month start. */
export function monthParam(monthStart: string): string {
  return monthStart.slice(0, 7);
}
