import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const DEFAULT_TIMEZONE = "America/Chihuahua";

/** Converts a wall-clock date + time in a given zone into an absolute UTC instant. */
export function zonedToUtc(date: string, time: string, timezone: string): Date {
  return fromZonedTime(`${date}T${time}:00`, timezone);
}

/** Formats a stored UTC instant for a specific viewer timezone. */
export function formatInZone(instant: Date, timezone: string, pattern = "HH:mm"): string {
  return formatInTimeZone(instant, timezone, pattern);
}

/** Renders a date-only column value (stored at UTC midnight) as "YYYY-MM-DD". */
export function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Parses a "YYYY-MM-DD" calendar date into the value a date-only column expects. */
export function parseDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/**
 * Whether a string is a calendar date that exists.
 *
 * The shape is not enough: "2026-02-31" matches every YYYY-MM-DD pattern and is
 * still not a day. Date arithmetic on one throws, so anything arriving from a form
 * or the address bar is checked here before it is counted or added to.
 */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = parseDateOnly(value);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Weekday (0 = Sunday) of a "YYYY-MM-DD" calendar date. */
export function weekdayOfDate(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Today's calendar date in a timezone, as "YYYY-MM-DD". */
export function todayInZone(timezone: string, now: Date = new Date()): string {
  return formatInZone(now, timezone, "yyyy-MM-dd");
}

/** Shifts a "YYYY-MM-DD" calendar date by a number of days. */
export function addDaysToDate(date: string, days: number): string {
  const shifted = parseDateOnly(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return formatDateOnly(shifted);
}

/** Monday of the week containing a "YYYY-MM-DD" calendar date. */
export function startOfWeekDate(date: string): string {
  const weekday = weekdayOfDate(date);
  return addDaysToDate(date, weekday === 0 ? -6 : 1 - weekday);
}

/** Every calendar date of a month, as "YYYY-MM-DD". Month is 1-12. */
export function datesInMonth(year: number, month: number): string[] {
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return Array.from({ length: dayCount }, (_, index) =>
    formatDateOnly(new Date(Date.UTC(year, month - 1, index + 1)))
  );
}