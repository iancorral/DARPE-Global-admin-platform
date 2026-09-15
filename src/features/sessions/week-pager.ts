import { addDaysToDate } from "@/lib/datetime";
import { calendarUrl } from "./scheduling";

/**
 * Where the calendar's week pager can go from the week on screen.
 *
 * Pure, and returning **addresses rather than actions**, which is the point.
 * The pager used to be three buttons that pushed a route inside a transition
 * and disabled themselves while it was pending, so any slow or failed fetch
 * left every week control dead with nothing on screen explaining why. Links
 * cannot get stuck: the browser owns the navigation, Next prefetches them, and
 * they still work opened in a new tab.
 *
 * The teacher filter and an open move both travel along, so changing week never
 * silently drops what staff were doing.
 */
export const DAYS_IN_WEEK = 7;

export type WeekPagerLinks = {
  previous: string;
  next: string;
  today: string;
  /** True when the week on screen is the one containing today. */
  isOnTodaysWeek: boolean;
};

export function weekPagerLinks({
  weekStart,
  todayWeekStart,
  teacherId,
  movingId,
}: {
  weekStart: string;
  todayWeekStart: string;
  teacherId?: string;
  movingId?: string;
}): WeekPagerLinks {
  const carried = { teacher: teacherId, moving: movingId };

  return {
    previous: calendarUrl({ week: addDaysToDate(weekStart, -DAYS_IN_WEEK), ...carried }),
    next: calendarUrl({ week: addDaysToDate(weekStart, DAYS_IN_WEEK), ...carried }),
    today: calendarUrl({ week: todayWeekStart, ...carried }),
    isOnTodaysWeek: weekStart === todayWeekStart,
  };
}
