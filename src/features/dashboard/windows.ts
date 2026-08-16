import { addDaysToDate, startOfWeekDate, todayInZone, zonedToUtc } from "@/lib/datetime";

/**
 * The UTC boundaries of the academy's "today" and "this week".
 *
 * The dashboard's questions — what happens today, what is still open from
 * before today, how the week looks — are all wall-clock questions in the
 * academy timezone, while sessions are stored as UTC instants. These windows
 * are where that translation happens, once, so every dashboard query filters
 * by the same boundaries.
 *
 * Pure: `now` is injected so the arithmetic is testable without a clock.
 */
export type DashboardWindows = {
  /** Academy calendar date of "today", as YYYY-MM-DD. */
  todayDate: string;
  /** Monday of the academy week containing today, as YYYY-MM-DD. */
  weekStartDate: string;
  todayStart: Date;
  tomorrowStart: Date;
  weekStart: Date;
  nextWeekStart: Date;
};

export function dashboardWindows(now: Date, timezone: string): DashboardWindows {
  const todayDate = todayInZone(timezone, now);
  const weekStartDate = startOfWeekDate(todayDate);

  return {
    todayDate,
    weekStartDate,
    todayStart: zonedToUtc(todayDate, "00:00", timezone),
    tomorrowStart: zonedToUtc(addDaysToDate(todayDate, 1), "00:00", timezone),
    weekStart: zonedToUtc(weekStartDate, "00:00", timezone),
    nextWeekStart: zonedToUtc(addDaysToDate(weekStartDate, 7), "00:00", timezone),
  };
}
