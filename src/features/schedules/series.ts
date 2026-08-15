import type { ClassStatus, ClassType } from "@/generated/prisma/client";
import {
  DEFAULT_TIMEZONE,
  addDaysToDate,
  isCalendarDate,
  parseDateOnly,
  weekdayOfDate,
  zonedToUtc,
} from "@/lib/datetime";
import {
  partitionByTeacherAvailability,
  type TeacherTimeRange,
} from "@/features/sessions/conflicts";

/**
 * A finite weekly series, as the calendar creates one.
 *
 * Everything here is pure: dates in, records out. The server decides whether a
 * series may be written, and this decides what it consists of — so the arithmetic
 * that turns "every Monday for four weeks" into concrete classes can be tested
 * without a database, and the dialog can preview exactly what will be created.
 */

/** How many classes a calendar-created series contains unless staff change it. */
export const DEFAULT_SERIES_WEEKS = 4;

/**
 * The default service period, in days from the first class to its inclusive end.
 *
 * 27, not 28: the four classes fall on day 0, 7, 14 and 21, and the period runs to
 * the day before a fifth one would be due. Ending on day 28 would quietly schedule
 * a fifth class; ending on day 21 would end the service the moment the last class
 * starts.
 */
export const DEFAULT_SERIES_SPAN_DAYS = DEFAULT_SERIES_WEEKS * 7 - 1;

/**
 * The longest series the calendar will create in one step.
 *
 * A guard rather than a business rule: a single request expands into one row per
 * week, and an end date typed years out would write thousands of classes inside
 * one serializable transaction. Half a year is far beyond any service period
 * DARPE has described, so it constrains nothing staff actually do.
 */
export const MAX_SERIES_WEEKS = 26;

export const MAX_SERIES_SPAN_DAYS = MAX_SERIES_WEEKS * 7 - 1;

/** The inclusive end date a new series offers by default. */
export function defaultSeriesEndsOn(startsOn: string): string {
  return addDaysToDate(startsOn, DEFAULT_SERIES_SPAN_DAYS);
}

/**
 * The dates a weekly series actually lands on: the first one, then every seventh
 * day up to and including the end date.
 *
 * The end date is a service period, not an occurrence, so any end date from the
 * last class's day up to the day before the next one would be due produces the
 * same list. Returns nothing for a range that is backwards or malformed, so a
 * caller can never mistake bad input for a series of one.
 */
export function weeklyOccurrenceDates(startsOn: string, endsOn: string): string[] {
  if (!isCalendarDate(startsOn) || !isCalendarDate(endsOn)) return [];
  if (endsOn < startsOn) return [];

  const dates: string[] = [];

  for (let week = 0; week <= MAX_SERIES_WEEKS; week += 1) {
    const date = addDaysToDate(startsOn, week * 7);
    if (date > endsOn) break;

    dates.push(date);
  }

  return dates;
}

/** One class of a series, before it is written. */
export type SeriesOccurrence = TeacherTimeRange & {
  occurrenceOn: string;
  languageId: string;
  studentId: string;
};

export type WeeklySeriesDraft = {
  slot: {
    studentId: string;
    teacherId: string;
    weekday: number;
    startTime: string;
    durationMinutes: number;
    startsOn: Date;
    endsOn: Date;
    active: true;
  };
  occurrences: SeriesOccurrence[];
};

/**
 * The recurring pattern and the concrete classes a new weekly series consists of.
 *
 * The weekday is derived from the first date rather than accepted from the caller,
 * so the pattern and its classes cannot describe different days. The language comes
 * from the student, as it does for a single class. Wall-clock start times are
 * converted in the academy's timezone, so a series that crosses a daylight-saving
 * change still happens at the same local time every week.
 */
export function buildWeeklySeries(params: {
  startsOn: string;
  endsOn: string;
  startTime: string;
  durationMinutes: number;
  teacherId: string;
  student: { id: string; languageId: string };
  timezone?: string;
}): WeeklySeriesDraft {
  const timezone = params.timezone ?? DEFAULT_TIMEZONE;

  return {
    slot: {
      studentId: params.student.id,
      teacherId: params.teacherId,
      weekday: weekdayOfDate(params.startsOn),
      startTime: params.startTime,
      durationMinutes: params.durationMinutes,
      startsOn: parseDateOnly(params.startsOn),
      endsOn: parseDateOnly(params.endsOn),
      active: true,
    },
    occurrences: weeklyOccurrenceDates(params.startsOn, params.endsOn).map((date) => ({
      occurrenceOn: date,
      startsAt: zonedToUtc(date, params.startTime, timezone),
      durationMinutes: params.durationMinutes,
      teacherId: params.teacherId,
      languageId: params.student.languageId,
      studentId: params.student.id,
    })),
  };
}

export type SeriesSessionRecord = {
  startsAt: Date;
  durationMinutes: number;
  type: ClassType;
  status: ClassStatus;
  teacherId: string;
  languageId: string;
  scheduleSlotId: string;
  slotOccurrenceOn: Date;
};

/**
 * The ClassSession rows a planned series becomes.
 *
 * Each one carries the slot it belongs to and the occurrence date it stands for,
 * so monthly generation counts these classes as already generated instead of
 * creating them a second time, and a later reschedule keeps `slotOccurrenceOn`
 * pointing at the occurrence it started as.
 */
export function seriesSessionRecords(
  scheduleSlotId: string,
  occurrences: SeriesOccurrence[]
): SeriesSessionRecord[] {
  return occurrences.map((occurrence) => ({
    startsAt: occurrence.startsAt,
    durationMinutes: occurrence.durationMinutes,
    type: "INDIVIDUAL",
    status: "SCHEDULED",
    teacherId: occurrence.teacherId,
    languageId: occurrence.languageId,
    scheduleSlotId,
    slotOccurrenceOn: parseDateOnly(occurrence.occurrenceOn),
  }));
}

export type SeriesPlan =
  | { ok: true; occurrences: SeriesOccurrence[] }
  | { ok: false; conflicts: SeriesOccurrence[] };

/**
 * Whether a whole series can be booked, given the teacher's occupied time.
 *
 * All or nothing on purpose: a series is a promise to a student about a weekly
 * time, and quietly dropping the third week would leave staff believing a class
 * exists that does not. So one clash refuses the lot, and the caller writes
 * nothing — there is no partial payload to write, because none is produced.
 *
 * Uses the shared availability predicate, which also treats accepted candidates as
 * occupied, so the occurrences of the new series cannot overlap each other either.
 */
export function planWeeklySeries(
  occurrences: SeriesOccurrence[],
  occupied: TeacherTimeRange[]
): SeriesPlan {
  const { conflicted } = partitionByTeacherAvailability(occurrences, occupied);

  return conflicted.length > 0 ? { ok: false, conflicts: conflicted } : { ok: true, occurrences };
}

/** How many clashing dates a refusal names before summarising the rest. */
export const MAX_LISTED_SERIES_CONFLICTS = 3;

/**
 * Why a series was refused, in terms of the weeks that clash.
 *
 * A long series can clash many times over, and a message listing twenty dates is
 * one nobody reads, so it names the first few and counts the rest. It says plainly
 * that nothing was created, because the alternative — assuming a partial series
 * landed — is the expensive mistake.
 */
export function seriesConflictMessage(teacherName: string, whenLabels: string[]): string {
  const listed = whenLabels.slice(0, MAX_LISTED_SERIES_CONFLICTS);
  const remaining = whenLabels.length - listed.length;
  const when = remaining > 0 ? `${listed.join(", ")} and ${remaining} more` : listed.join(", ");

  return `${teacherName} already has a class on ${when}. Nothing was created — every week of a series has to be free.`;
}
