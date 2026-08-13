import { findOverlap, type TimeRange } from "./conflicts";

/**
 * Geometry and payloads for changing when a class happens.
 *
 * Everything here is pure: the calendar decides where a destination sits and what
 * it means, and the server decides whether it is allowed. Keeping the arithmetic
 * out of the components makes both testable without a browser or a database.
 */

/** Destinations snap to quarter hours, which is how classes are actually scheduled. */
export const SNAP_MINUTES = 15;

export type MinuteRange = { startMinutes: number; durationMinutes: number };

/** Nearest quarter hour, never before midnight. */
export function snapToSlot(minutes: number): number {
  return Math.max(0, Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES);
}

/** Where a pointer offset inside a day column lands, snapped to a usable start time. */
export function minutesFromOffset(
  offsetPx: number,
  dayStartMinutes: number,
  pixelsPerHour: number
): number {
  return snapToSlot(dayStartMinutes + (offsetPx / pixelsPerHour) * 60);
}

/** Where a start time sits inside a day column, in pixels from its top. */
export function offsetFromMinutes(
  minutes: number,
  dayStartMinutes: number,
  pixelsPerHour: number
): number {
  return ((minutes - dayStartMinutes) / 60) * pixelsPerHour;
}

/**
 * Every start time a class of this length can occupy in the visible grid.
 * A class may not start so late that it would run past the last visible hour.
 */
export function slotStarts(
  startHour: number,
  endHour: number,
  durationMinutes: number
): number[] {
  const starts: number[] = [];
  const last = endHour * 60 - durationMinutes;

  for (let minutes = startHour * 60; minutes <= last; minutes += SNAP_MINUTES) {
    starts.push(minutes);
  }

  return starts;
}

export type DestinationState = "original" | "conflict" | "free";

/**
 * Minute ranges within one day, expressed as instants on a shared synthetic day so
 * the calendar reuses the same overlap predicate the server enforces rather than
 * growing a second one that could drift from it.
 */
function asRange(range: MinuteRange): TimeRange {
  return {
    startsAt: new Date(range.startMinutes * 60_000),
    durationMinutes: range.durationMinutes,
  };
}

/**
 * What a destination means for the class being moved.
 *
 * `occupied` is the teacher's other time on that day, so this marks the same
 * double-bookings the server refuses. It is a preview, not the decision: the
 * calendar can be filtered to one teacher, and the data can go stale while move
 * mode is open, so the server always re-checks before anything is written.
 */
export function classifyDestination(
  candidate: MinuteRange,
  occupied: MinuteRange[],
  originalStartMinutes: number | null
): DestinationState {
  if (originalStartMinutes !== null && candidate.startMinutes === originalStartMinutes) {
    return "original";
  }

  return findOverlap(asRange(candidate), occupied.map(asRange)) ? "conflict" : "free";
}

/** Minutes since midnight as the "HH:MM" wall-clock time the server expects. */
export function formatSlotTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export type SchedulingUpdate = {
  startsAt: Date;
  durationMinutes: number;
  teacherId: string;
};

/**
 * The only fields a scheduling change is allowed to write.
 *
 * Built explicitly so a move can never reach the recurring pattern: `scheduleSlotId`
 * and `slotOccurrenceOn` are absent, which keeps regeneration treating the
 * occurrence as done, and nothing here can touch the ScheduleSlot itself or the
 * student's primary teacher.
 */
export function buildSchedulingUpdate(params: SchedulingUpdate): SchedulingUpdate {
  return {
    startsAt: params.startsAt,
    durationMinutes: params.durationMinutes,
    teacherId: params.teacherId,
  };
}

/**
 * A calendar link. Move mode lives in the URL so it survives navigating to another
 * week, and so cancelling it is just going back to the calendar without it.
 */
export function calendarUrl(params: {
  week: string;
  teacher?: string;
  moving?: string;
}): string {
  const query = new URLSearchParams({ week: params.week });
  if (params.teacher) query.set("teacher", params.teacher);
  if (params.moving) query.set("moving", params.moving);

  return `/calendar?${query.toString()}`;
}
