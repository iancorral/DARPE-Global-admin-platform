import { addDaysToDate, startOfWeekDate } from "@/lib/datetime";
import type { ClassStatus } from "@/generated/prisma/client";

/** One bar of the activity chart: a week of the month, counted by status. */
export type ActivityWeek = {
  /** Monday of the week, as YYYY-MM-DD — stable key and sort order. */
  weekStart: string;
  /** Short human label, e.g. "Aug 3". */
  label: string;
  scheduled: number;
  completed: number;
  cancelled: number;
  total: number;
};

export type ActivityInput = {
  /** Academy calendar date of the class, as YYYY-MM-DD. */
  date: string;
  status: ClassStatus;
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-08-03" → "Aug 3". Formatting a plain calendar date needs no timezone. */
function shortLabel(date: string): string {
  const month = MONTH_NAMES[Number(date.slice(5, 7)) - 1] ?? "";
  return `${month} ${Number(date.slice(8, 10))}`;
}

/**
 * A month's classes bucketed into the weeks that make it up.
 *
 * Every week overlapping the month gets a bar, including weeks with nothing in
 * them: a month whose middle week is empty should show a gap, not silently
 * close it up and imply the classes were spread evenly.
 *
 * Weeks start on Monday, matching the calendar, so a bar covers the same span
 * of days staff already read a week as. The first and last bars may reach
 * outside the month; only classes inside the month are counted, which is what
 * makes the totals agree with the month figures shown elsewhere.
 *
 * Pure: it takes academy calendar dates, so no timezone conversion happens here.
 */
export function groupActivityByWeek(
  classes: ActivityInput[],
  monthStartDate: string,
  monthEndDate: string
): ActivityWeek[] {
  const weeks = new Map<string, ActivityWeek>();

  for (
    let cursor = startOfWeekDate(monthStartDate);
    cursor <= monthEndDate;
    cursor = addDaysToDate(cursor, 7)
  ) {
    weeks.set(cursor, {
      weekStart: cursor,
      label: shortLabel(cursor),
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      total: 0,
    });
  }

  for (const item of classes) {
    if (item.date < monthStartDate || item.date > monthEndDate) continue;

    const bucket = weeks.get(startOfWeekDate(item.date));
    if (!bucket) continue;

    if (item.status === "SCHEDULED") bucket.scheduled += 1;
    else if (item.status === "COMPLETED") bucket.completed += 1;
    else bucket.cancelled += 1;

    bucket.total += 1;
  }

  return [...weeks.values()];
}

/**
 * The chart's meaning in a sentence, for screen readers and for anyone who
 * cannot hover a bar. The chart itself is then safe to hide from assistive
 * technology: nothing in it is unavailable in text.
 */
export function describeActivity(weeks: ActivityWeek[], monthLabel: string): string {
  const completed = weeks.reduce((sum, week) => sum + week.completed, 0);
  const scheduled = weeks.reduce((sum, week) => sum + week.scheduled, 0);
  const cancelled = weeks.reduce((sum, week) => sum + week.cancelled, 0);
  const total = completed + scheduled + cancelled;

  if (total === 0) {
    return `No classes recorded in ${monthLabel}.`;
  }

  const busiest = weeks.reduce((best, week) => (week.total > best.total ? week : best), weeks[0]!);

  return (
    `${monthLabel}: ${total} ${total === 1 ? "class" : "classes"} across ${weeks.length} ` +
    `${weeks.length === 1 ? "week" : "weeks"} — ${completed} completed, ${scheduled} scheduled, ` +
    `${cancelled} cancelled. Busiest week begins ${busiest.label} with ${busiest.total}.`
  );
}
