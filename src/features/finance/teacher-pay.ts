import type { Attendance, ClassType } from "@/generated/prisma/client";
import { addDaysToDate, isCalendarDate, startOfWeekDate } from "@/lib/datetime";

/**
 * What a teacher earns — DARPE's rates as agreed on 2026-09-21.
 *
 * Paid by the hour, and the rate depends on the kind of class:
 *
 * - **Individual:** $200 an hour.
 * - **Group:** $170 an hour for two students, $10 more for each further
 *   student — $180 for three, $190 for four, $200 for five.
 *
 * Two edges DARPE did not spell out, decided here so there is one answer:
 * a group class with a single student pays the two-student base, and one with
 * more than five pays the five-student rate. Both are constants below.
 *
 * Only this file knows the numbers. Everything that shows or records pay asks
 * `classPayCents`, so a new rate is a change in one place.
 */
export const INDIVIDUAL_HOURLY_CENTS = 20_000;
export const GROUP_BASE_HOURLY_CENTS = 17_000;
export const GROUP_BASE_STUDENTS = 2;
export const GROUP_STEP_CENTS = 1_000;
export const GROUP_MAX_PRICED_STUDENTS = 5;

/** The hourly rate for a group class of `students`. */
export function groupHourlyCents(students: number): number {
  const priced = Math.min(
    Math.max(students, GROUP_BASE_STUDENTS),
    GROUP_MAX_PRICED_STUDENTS
  );

  return GROUP_BASE_HOURLY_CENTS + (priced - GROUP_BASE_STUDENTS) * GROUP_STEP_CENTS;
}

export function hourlyRateCents(type: ClassType, students: number): number {
  return type === "GROUP" ? groupHourlyCents(students) : INDIVIDUAL_HOURLY_CENTS;
}

/** What one class pays: its hourly rate for its length. */
export function classPayCents(session: {
  type: ClassType;
  students: number;
  durationMinutes: number;
}): number {
  return Math.round(
    (hourlyRateCents(session.type, session.students) * session.durationMinutes) / 60
  );
}

/**
 * Whether a participant counts toward a group's size for pay.
 *
 * Somebody marked absent or excused was not in the class. A participant with no
 * attendance recorded counts — the class was completed with them on the list.
 */
export function countsTowardsGroupSize(attendance: Attendance | null): boolean {
  return attendance !== "ABSENT" && attendance !== "EXCUSED";
}

/*
 * Pay weeks. Teachers are paid on Fridays. A week runs Monday to Sunday and is
 * paid on the Friday after it ends, so every class in it — Saturday's
 * included — has happened and been marked complete before anyone is paid.
 */
export const PAY_WEEK_DAYS = 7;
/** Monday plus eleven days is the following week's Friday. */
const PAYDAY_OFFSET_DAYS = 11;

export function payWeekEnd(weekStart: string): string {
  return addDaysToDate(weekStart, PAY_WEEK_DAYS - 1);
}

export function paydayFor(weekStart: string): string {
  return addDaysToDate(weekStart, PAYDAY_OFFSET_DAYS);
}

export function shiftPayWeek(weekStart: string, weeks: number): string {
  return addDaysToDate(weekStart, weeks * PAY_WEEK_DAYS);
}

/** The week paid this coming Friday: the most recent one that has fully ended. */
export function defaultPayWeekStart(today: string): string {
  return shiftPayWeek(startOfWeekDate(today), -1);
}

/**
 * The pay week to show, from `?week=YYYY-MM-DD` — any day in it.
 *
 * Anything unreadable, or a week that has not started yet, falls back to the
 * default: there is nothing to pay for a week that has not happened.
 */
export function selectedPayWeek(param: string | undefined, today: string): string {
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param) || !isCalendarDate(param)) {
    return defaultPayWeekStart(today);
  }

  const weekStart = startOfWeekDate(param);
  return weekStart > startOfWeekDate(today) ? defaultPayWeekStart(today) : weekStart;
}
