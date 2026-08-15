import { z } from "zod";
import { addDaysToDate, isCalendarDate } from "@/lib/datetime";
import { MAX_SERIES_SPAN_DAYS } from "@/features/schedules/series";
import { CALENDAR_PATH, calendarUrl, parseWallClockMinutes } from "./scheduling";
import { offeredDurationSchema } from "./schemas";

/**
 * Leaving the calendar to add a student, and coming back to the same position.
 *
 * The round trip is expressed as a small typed context rather than a `returnTo`
 * URL. A URL parameter that another page will navigate to is an open redirect
 * waiting to happen: it only takes one place that forgets to check the host. Here
 * there is nothing to check — the destination is a constant in this file, and the
 * context carries only the handful of values needed to rebuild the position.
 *
 * Everything in it is untrusted UI state. It says which position the dialog was
 * opened at and which student to preselect; it never says what may be created.
 * The server actions re-fetch and re-check the student, the teacher and the time
 * regardless of what came back in the address bar.
 *
 * No personal information travels in it. Names, emails, phone numbers and notes
 * stay in the database — a URL is shared, logged and left in browser history, and
 * an id that only means something to this application is enough to look the rest
 * up again.
 */

/** The two ways the calendar creates classes. */
export const CREATE_MODES = ["one-time", "weekly"] as const;

export type CreateMode = (typeof CREATE_MODES)[number];

export const DEFAULT_CREATE_MODE: CreateMode = "one-time";

/** The one internal origin the student form will return to. */
export const CALENDAR_RETURN_MARKER = "calendar";

export const NEW_STUDENT_PATH = "/students/new";

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const wallClockSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/**
 * The shape of a record id as this application generates them (cuid).
 *
 * Narrow on purpose: an id from the address bar is only ever used to look a record
 * up, and anything outside this alphabet is not one of ours.
 */
const recordIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

/**
 * A duration the calendar actually offers, or null.
 *
 * The same rule the create-class schemas use, so a length that survives the round
 * trip is one the form could have produced. Anything else is dropped rather than
 * refused: a mangled duration is a reason to fall back to the default, never a
 * reason to lose the position the user was working at.
 */
function usableDuration(raw: unknown): number | null {
  const parsed = offeredDurationSchema.safeParse(raw);

  return parsed.success ? parsed.data : null;
}

/**
 * A repeat-until date this series could really use, or null.
 *
 * Held to exactly what `weeklySeriesSchema` will accept when the class is finally
 * created — a real date, not before the first class, and within the longest series
 * the calendar creates — so restoring it can never put the dialog into a state the
 * server would reject. It only means anything in weekly mode: a one-time class has
 * no end date, so one arriving alongside it is ignored.
 */
function usableUntil(
  mode: CreateMode,
  date: string,
  raw: string | undefined
): string | null {
  if (mode !== "weekly" || !raw) return null;
  if (!isCalendarDate(date) || !isCalendarDate(raw)) return null;
  if (raw < date) return null;
  if (raw > addDaysToDate(date, MAX_SERIES_SPAN_DAYS)) return null;

  return raw;
}

/**
 * The calendar context handed to the student form and handed back.
 *
 * `from` is a fixed marker, not a destination: the only value that means anything
 * is "calendar", so there is no way to express "return to somewhere else".
 *
 * `duration` and `until` are the two answers already given in the dialog that are
 * worth carrying: they describe the class, not the people in it, so no privacy is
 * spent on saving the user from typing them again. They are also the only two that
 * survive — the chosen teacher deliberately does not, because the new student may
 * study another language and the teacher list has to be worked out from them.
 *
 * Both are lenient: a value that is malformed, out of range or inconsistent with
 * the mode is dropped here and the dialog falls back to its normal default.
 */
export const calendarReturnSchema = z
  .object({
    from: z.literal(CALENDAR_RETURN_MARKER),
    week: calendarDateSchema,
    date: calendarDateSchema,
    time: wallClockSchema,
    mode: z.enum(CREATE_MODES),
    teacher: recordIdSchema.optional(),
    duration: z.unknown().optional(),
    until: z.unknown().optional(),
  })
  .transform(({ duration, until, ...position }) => {
    const durationMinutes = usableDuration(duration);
    const endsOn = usableUntil(
      position.mode,
      position.date,
      typeof until === "string" ? until : undefined
    );

    // Spread in only what survived, so an unusable value leaves no trace in the
    // context and the dialog simply uses its default.
    return {
      ...position,
      ...(durationMinutes !== null && { duration: durationMinutes }),
      ...(endsOn !== null && { until: endsOn }),
    };
  });

export type CalendarReturnContext = z.infer<typeof calendarReturnSchema>;

/**
 * The context in a set of search params, or null when there is not a complete and
 * valid one. Unknown keys are dropped, so nothing can be smuggled through it.
 */
export function parseCalendarReturn(raw: unknown): CalendarReturnContext | null {
  const parsed = calendarReturnSchema.safeParse(raw);

  return parsed.success ? parsed.data : null;
}

/**
 * The two answers already given in the dialog, as a URL may carry them.
 *
 * Applied when a link is built as well as when one is read, so a value that could
 * not be restored is never written into an address bar in the first place.
 */
function carriedValues(context: CalendarReturnContext): {
  duration?: string;
  until?: string;
} {
  const duration = usableDuration(context.duration);
  const until = usableUntil(context.mode, context.date, context.until);

  return {
    ...(duration !== null && { duration: String(duration) }),
    ...(until !== null && { until }),
  };
}

/** The student form, told where the calendar was left and what was filled in. */
export function newStudentUrl(context: CalendarReturnContext): string {
  const carried = carriedValues(context);
  const query = new URLSearchParams({
    from: CALENDAR_RETURN_MARKER,
    week: context.week,
    date: context.date,
    time: context.time,
    mode: context.mode,
  });
  if (context.teacher) query.set("teacher", context.teacher);
  if (carried.duration) query.set("duration", carried.duration);
  if (carried.until) query.set("until", carried.until);

  return `${NEW_STUDENT_PATH}?${query.toString()}`;
}

/**
 * The calendar position the round trip started from, with the new student
 * preselected when there is one, and the duration and repeat-until date the dialog
 * had already been given.
 *
 * The id is validated here too. It has just come back from a form, but this is
 * what a URL is built from, and a value that is not one of our ids is simply left
 * out rather than carried forward. Cancelling the student form goes through this
 * as well, so backing out restores exactly the same dialog, minus the student.
 */
export function calendarReturnUrl(
  context: CalendarReturnContext,
  studentId?: string | null
): string {
  return calendarUrl({
    week: context.week,
    teacher: context.teacher,
    date: context.date,
    time: context.time,
    mode: context.mode,
    student: recordIdSchema.safeParse(studentId).success ? (studentId ?? undefined) : undefined,
    ...carriedValues(context),
  });
}

/** A create-class dialog the URL is asking the calendar to reopen. */
export type CalendarCreateIntent = {
  date: string;
  startMinutes: number;
  mode: CreateMode;
  studentId: string | null;
  /** The duration to restore, or null to use the dialog's default. */
  durationMinutes: number | null;
  /** The repeat-until date to restore. Only ever set in weekly mode. */
  endsOn: string | null;
};

/**
 * What the calendar's creation params mean, if anything.
 *
 * Move mode wins outright. A position in the grid can only mean one thing, and
 * while a class is being moved it means "put it here" — so a stale creation
 * context in the same URL is ignored rather than opening a dialog over a move.
 *
 * Anything malformed degrades quietly: without a valid date and time there is no
 * position to reopen at, so the calendar just shows the week. An unrecognised mode
 * falls back to a single class, which is the one that changes the least, and a
 * duration or repeat-until date that cannot be used falls back to the dialog's
 * default rather than taking the position down with it.
 */
export function calendarCreateIntent(params: {
  moving?: string | null;
  date?: string | null;
  time?: string | null;
  mode?: string | null;
  student?: string | null;
  duration?: string | null;
  until?: string | null;
}): CalendarCreateIntent | null {
  if (params.moving) return null;

  const date = calendarDateSchema.safeParse(params.date);
  const time = wallClockSchema.safeParse(params.time);
  if (!date.success || !time.success) return null;

  const startMinutes = parseWallClockMinutes(time.data);
  if (startMinutes === null) return null;

  const parsedMode = z.enum(CREATE_MODES).safeParse(params.mode);
  const mode = parsedMode.success ? parsedMode.data : DEFAULT_CREATE_MODE;

  return {
    date: date.data,
    startMinutes,
    mode,
    studentId: preselectedStudentId(params.student),
    durationMinutes: usableDuration(params.duration),
    endsOn: usableUntil(mode, date.data, params.until ?? undefined),
  };
}

/**
 * A student the calendar should preselect, from the address bar.
 *
 * Used on its own by the "Schedule class" link on a student's profile, which
 * preselects the student but deliberately leaves the position to the calendar. The
 * id is only a suggestion for the form: the page still checks it against the
 * students that may actually be scheduled, and the server checks it again.
 */
export function preselectedStudentId(raw?: string | null): string | null {
  const parsed = recordIdSchema.safeParse(raw);

  return parsed.success ? parsed.data : null;
}

/** Where the calendar link on a student's profile goes. */
export function scheduleForStudentUrl(week: string, studentId: string): string {
  return calendarUrl({ week, student: preselectedStudentId(studentId) ?? undefined });
}

export { CALENDAR_PATH };
