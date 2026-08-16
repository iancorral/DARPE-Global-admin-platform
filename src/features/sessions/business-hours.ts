/**
 * The hours DARPE normally teaches, and what "outside them" means.
 *
 * These are a display convention, never a rule: DARPE teaches online to
 * students in other countries, so a 07:00 class before somebody's work day or
 * a 21:30 one across time zones is a real thing that has to be bookable. The
 * calendar therefore shows a wider span than the working day and marks the
 * edges, rather than hiding them and making those times unreachable.
 *
 * Nothing here validates anything. The server accepts any aligned time inside
 * the scheduling rules; this only changes how the grid reads.
 *
 * `BusinessHours` is a parameter everywhere it is used, so the Settings screen
 * can hand the academy's real hours in without this module changing.
 */
export type BusinessHours = {
  /** First hour of the normal working day, 0–23. */
  startHour: number;
  /** First hour that is no longer the working day, 1–24. */
  endHour: number;
};

/**
 * The default working day, until Settings can store the academy's own.
 *
 * Chosen to match the hours most classes already fall in, so the marking means
 * something: make it as wide as the grid and nothing is ever marked.
 */
export const DEFAULT_BUSINESS_HOURS: BusinessHours = { startHour: 8, endHour: 20 };

/**
 * Whether a wall-clock minute of the day falls outside the working day.
 *
 * A class starting exactly at the closing hour is outside it — 20:00 is when
 * the day ends, so a class beginning then runs past it.
 */
export function isOutsideBusinessHours(
  startMinutes: number,
  hours: BusinessHours = DEFAULT_BUSINESS_HOURS
): boolean {
  return startMinutes < hours.startHour * 60 || startMinutes >= hours.endHour * 60;
}

/** Whether a whole hour row of the grid lies outside the working day. */
export function isOutsideBusinessHour(
  hour: number,
  hours: BusinessHours = DEFAULT_BUSINESS_HOURS
): boolean {
  return hour < hours.startHour || hour >= hours.endHour;
}
