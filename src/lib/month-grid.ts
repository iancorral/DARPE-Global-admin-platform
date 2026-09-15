import { addDaysToDate, weekdayOfDate } from "./datetime";

/**
 * The cells a month calendar draws, as plain YYYY-MM-DD strings.
 *
 * Pure and timezone-free on purpose: these are calendar dates, not instants.
 * Building the grid from `Date` objects is how a picker ends up a day out for
 * anyone west of UTC, which is everyone at DARPE.
 *
 * Always six rows of seven. A fixed height means the popover does not resize as
 * you page through months, which is what makes clicking through them feel calm.
 */
export const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export type MonthCell = {
  date: string;
  /** False for the leading and trailing days borrowed from the months around. */
  inMonth: boolean;
};

/** First day of a month, as YYYY-MM-DD. */
export function monthStart(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
}

/** The month `delta` months away from a YYYY-MM-DD date, as its first day. */
export function shiftMonth(date: string, delta: number): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const zeroBased = year * 12 + (month - 1) + delta;

  return monthStart(Math.floor(zeroBased / 12), (zeroBased % 12) + 1);
}

/**
 * Six weeks of cells covering the month `date` falls in, Sunday first.
 *
 * Sunday first because the app's own weekday numbering is 0 = Sunday, and
 * having one convention beats having two.
 */
export function monthGrid(date: string): MonthCell[] {
  const first = `${date.slice(0, 7)}-01`;
  const month = first.slice(0, 7);
  const start = addDaysToDate(first, -weekdayOfDate(first));

  return Array.from({ length: 42 }, (_, index) => {
    const cell = addDaysToDate(start, index);

    return { date: cell, inMonth: cell.slice(0, 7) === month };
  });
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "August 2026", for the picker's header. */
export function monthLabel(date: string): string {
  const month = Number(date.slice(5, 7));

  return `${MONTH_NAMES[month - 1]} ${date.slice(0, 4)}`;
}

/** "29 Aug 2026" — unambiguous, unlike any all-numeric format. */
export function displayDate(date: string): string {
  const month = Number(date.slice(5, 7));

  return `${Number(date.slice(8, 10))} ${MONTH_NAMES[month - 1]?.slice(0, 3)} ${date.slice(0, 4)}`;
}
