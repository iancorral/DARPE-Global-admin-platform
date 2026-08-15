import { describe, expect, it } from "vitest";
import { DEFAULT_TIMEZONE, formatInZone, zonedToUtc } from "@/lib/datetime";
import {
  buildManualSession,
  checkManualClassEligibility,
} from "@/features/sessions/eligibility";
import { creationInputFor } from "@/features/sessions/scheduling";
import type { TeacherTimeRange } from "@/features/sessions/conflicts";
import { expandSlotsForDates } from "./generation";
import {
  DEFAULT_SERIES_SPAN_DAYS,
  DEFAULT_SERIES_WEEKS,
  MAX_LISTED_SERIES_CONFLICTS,
  buildWeeklySeries,
  defaultSeriesEndsOn,
  planWeeklySeries,
  seriesConflictMessage,
  seriesSessionRecords,
  weeklyOccurrenceDates,
} from "./series";

/**
 * A weekly series as the calendar creates one, without a database: the dates it
 * lands on, the records it becomes, and whether the teacher is free for all of it.
 */

const MONDAY = "2026-08-17";

const series = (overrides?: { startsOn?: string; endsOn?: string; startTime?: string }) =>
  buildWeeklySeries({
    startsOn: overrides?.startsOn ?? MONDAY,
    endsOn: overrides?.endsOn ?? defaultSeriesEndsOn(overrides?.startsOn ?? MONDAY),
    startTime: overrides?.startTime ?? "09:00",
    durationMinutes: 60,
    teacherId: "teacher-1",
    student: { id: "student-1", languageId: "lang-en" },
  });

const busy = (date: string, time: string, durationMinutes = 60): TeacherTimeRange => ({
  teacherId: "teacher-1",
  startsAt: zonedToUtc(date, time, DEFAULT_TIMEZONE),
  durationMinutes,
});

describe("the four-week default", () => {
  it("ends 27 days after the first class, not 28", () => {
    // Day 28 is when a fifth class would be due; ending there would schedule it.
    expect(DEFAULT_SERIES_SPAN_DAYS).toBe(27);
    expect(defaultSeriesEndsOn(MONDAY)).toBe("2026-09-13");
  });

  it("produces exactly four classes", () => {
    expect(weeklyOccurrenceDates(MONDAY, defaultSeriesEndsOn(MONDAY))).toHaveLength(
      DEFAULT_SERIES_WEEKS
    );
  });

  it("puts them on the selected date and the next three weeks", () => {
    expect(weeklyOccurrenceDates(MONDAY, defaultSeriesEndsOn(MONDAY))).toEqual([
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
      "2026-09-07",
    ]);
  });

  it("still produces four for any end date before a fifth would be due", () => {
    // The end date is a service period, not an occurrence.
    for (const endsOn of ["2026-09-07", "2026-09-10", "2026-09-13"]) {
      expect(weeklyOccurrenceDates(MONDAY, endsOn)).toHaveLength(4);
    }

    expect(weeklyOccurrenceDates(MONDAY, "2026-09-14")).toHaveLength(5);
  });

  it("crosses a month boundary without renumbering the weeks", () => {
    expect(weeklyOccurrenceDates("2026-08-31", defaultSeriesEndsOn("2026-08-31"))).toEqual([
      "2026-08-31",
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
    ]);
  });
});

describe("an edited end date", () => {
  it("shortens the series", () => {
    expect(weeklyOccurrenceDates(MONDAY, "2026-08-30")).toEqual(["2026-08-17", "2026-08-24"]);
  });

  it("lengthens it", () => {
    expect(weeklyOccurrenceDates(MONDAY, "2026-09-21")).toHaveLength(6);
  });

  it("gives a single class when it ends the same day", () => {
    expect(weeklyOccurrenceDates(MONDAY, MONDAY)).toEqual([MONDAY]);
  });

  it("gives nothing for a range that runs backwards", () => {
    expect(weeklyOccurrenceDates(MONDAY, "2026-08-16")).toEqual([]);
  });

  it("gives nothing for a date that is not a date, rather than counting from it", () => {
    expect(weeklyOccurrenceDates(MONDAY, "2026-02-31")).toEqual([]);
    expect(weeklyOccurrenceDates("not-a-date", MONDAY)).toEqual([]);
    expect(weeklyOccurrenceDates(MONDAY, "")).toEqual([]);
  });
});

describe("buildWeeklySeries", () => {
  it("derives the weekday from the first date rather than being told it", () => {
    expect(series().slot.weekday).toBe(1);
    expect(series({ startsOn: "2026-08-22" }).slot.weekday).toBe(6);
    // Sunday is 0, and the data model supports it even though the grid hides it.
    expect(series({ startsOn: "2026-08-23" }).slot.weekday).toBe(0);
  });

  it("keeps the pattern and its classes on the same weekday", () => {
    const draft = series();

    for (const occurrence of draft.occurrences) {
      expect(new Date(`${occurrence.occurrenceOn}T00:00:00Z`).getUTCDay()).toBe(
        draft.slot.weekday
      );
    }
  });

  it("stores every class at the chosen wall-clock time in the academy timezone", () => {
    const draft = series({ startTime: "09:30" });

    expect(
      draft.occurrences.map((o) => formatInZone(o.startsAt, DEFAULT_TIMEZONE))
    ).toEqual(["09:30", "09:30", "09:30", "09:30"]);
  });

  it("stores absolute instants, not the academy's wall clock", () => {
    expect(series().occurrences[0]?.startsAt.toISOString()).not.toContain("T09:00");
  });

  it("takes the language from the student, never from the caller", () => {
    expect(series().occurrences.every((o) => o.languageId === "lang-en")).toBe(true);
  });

  it("gives the pattern a real end date, because a calendar series never runs forever", () => {
    expect(series().slot.endsOn).toBeInstanceOf(Date);
    expect(series().slot.active).toBe(true);
  });
});

describe("the records a series becomes", () => {
  const records = seriesSessionRecords("slot-1", series().occurrences);

  it("writes one class per week", () => {
    expect(records).toHaveLength(4);
  });

  it("links every class to the pattern it belongs to", () => {
    expect(records.every((record) => record.scheduleSlotId === "slot-1")).toBe(true);
  });

  it("records which occurrence each class stands for, so generation skips it", () => {
    expect(records.map((record) => record.slotOccurrenceOn.toISOString())).toEqual([
      "2026-08-17T00:00:00.000Z",
      "2026-08-24T00:00:00.000Z",
      "2026-08-31T00:00:00.000Z",
      "2026-09-07T00:00:00.000Z",
    ]);
  });

  it("creates scheduled individual classes", () => {
    expect(records.every((r) => r.type === "INDIVIDUAL" && r.status === "SCHEDULED")).toBe(
      true
    );
  });

  it("carries the student on the occurrences, so each class gets its participant", () => {
    expect(series().occurrences.every((o) => o.studentId === "student-1")).toBe(true);
  });
});

/** The one-time mode is untouched by any of this: it still writes a single class. */
describe("a one-time class from the same dialog", () => {
  const { date, startTime } = creationInputFor({
    date: MONDAY,
    startMinutes: 540,
    dayLabel: "Mon 17",
  });
  const draft = buildManualSession({
    startsAt: zonedToUtc(date, startTime, DEFAULT_TIMEZONE),
    durationMinutes: 60,
    teacherId: "teacher-1",
    student: { id: "student-1", languageId: "lang-en" },
  });

  it("belongs to no recurring pattern", () => {
    expect(draft.session.scheduleSlotId).toBeNull();
    expect(draft.session.slotOccurrenceOn).toBeNull();
  });

  it("is the same class the series' first week would be, minus the pattern", () => {
    const first = series().occurrences[0];

    expect(draft.session.startsAt.getTime()).toBe(first?.startsAt.getTime());
    expect(draft.session.durationMinutes).toBe(first?.durationMinutes);
    expect(draft.session.teacherId).toBe(first?.teacherId);
  });
});

describe("planWeeklySeries", () => {
  it("accepts a series the teacher is free for", () => {
    const plan = planWeeklySeries(series().occurrences, []);

    expect(plan.ok).toBe(true);
    expect(plan.ok === true && plan.occurrences).toHaveLength(4);
  });

  it("refuses the whole series when one week clashes with an existing class", () => {
    const plan = planWeeklySeries(series().occurrences, [busy("2026-08-31", "09:30")]);

    expect(plan.ok).toBe(false);
    expect(plan.ok === false && plan.conflicts.map((c) => c.occurrenceOn)).toEqual([
      "2026-08-31",
    ]);
  });

  it("produces nothing to write when it refuses, so no partial series can be created", () => {
    const plan = planWeeklySeries(series().occurrences, [busy("2026-08-31", "09:30")]);

    expect(plan.ok === false && "occurrences" in plan).toBe(false);
    // The only path to records goes through an accepted plan.
    expect(plan.ok === true ? seriesSessionRecords("slot-1", plan.occurrences) : []).toEqual(
      []
    );
  });

  it("allows a series back-to-back with the teacher's other classes", () => {
    const backToBack = weeklyOccurrenceDates(MONDAY, defaultSeriesEndsOn(MONDAY)).map((date) =>
      busy(date, "08:00")
    );

    expect(planWeeklySeries(series().occurrences, backToBack).ok).toBe(true);
  });

  it("allows a class ending exactly when a week of the series starts", () => {
    expect(planWeeklySeries(series().occurrences, [busy(MONDAY, "10:00")]).ok).toBe(true);
  });

  it("reports every clashing week, not just the first", () => {
    const plan = planWeeklySeries(series().occurrences, [
      busy("2026-08-17", "09:00"),
      busy("2026-09-07", "09:00"),
    ]);

    expect(plan.ok === false && plan.conflicts).toHaveLength(2);
  });
});

/**
 * A recurring pattern occupies its teacher whether or not its classes have been
 * generated yet, which is exactly the case monthly generation cannot see coming.
 */
describe("a series against another recurring pattern", () => {
  const dates = weeklyOccurrenceDates(MONDAY, defaultSeriesEndsOn(MONDAY));

  const existingPattern = [
    {
      id: "slot-existing",
      weekday: 1,
      startTime: "09:00",
      durationMinutes: 60,
      startsOn: new Date("2026-01-05T00:00:00Z"),
      endsOn: null,
      teacherId: "teacher-1",
      student: { id: "student-2", languageId: "lang-en" },
    },
  ];

  it("refuses the series even though the pattern has generated nothing", () => {
    const implied = expandSlotsForDates(existingPattern, dates);
    const plan = planWeeklySeries(series().occurrences, implied);

    expect(implied).toHaveLength(4);
    expect(plan.ok).toBe(false);
    expect(plan.ok === false && plan.conflicts).toHaveLength(4);
  });

  it("ignores a pattern on another weekday", () => {
    const implied = expandSlotsForDates(
      [{ ...existingPattern[0]!, weekday: 3 }],
      dates
    );

    expect(implied).toEqual([]);
    expect(planWeeklySeries(series().occurrences, implied).ok).toBe(true);
  });

  it("ignores a pattern whose validity window has already closed", () => {
    const implied = expandSlotsForDates(
      [{ ...existingPattern[0]!, endsOn: new Date("2026-08-01T00:00:00Z") }],
      dates
    );

    expect(implied).toEqual([]);
  });

  it("only blocks the weeks a pattern that starts mid-series actually covers", () => {
    const implied = expandSlotsForDates(
      [{ ...existingPattern[0]!, startsOn: new Date("2026-08-31T00:00:00Z") }],
      dates
    );
    const plan = planWeeklySeries(series().occurrences, implied);

    expect(plan.ok === false && plan.conflicts.map((c) => c.occurrenceOn)).toEqual([
      "2026-08-31",
      "2026-09-07",
    ]);
  });

  it("allows a pattern that finishes as the series begins", () => {
    const implied = expandSlotsForDates(
      [{ ...existingPattern[0]!, startTime: "08:00" }],
      dates
    );

    expect(planWeeklySeries(series().occurrences, implied).ok).toBe(true);
  });
});

describe("seriesConflictMessage", () => {
  const label = (day: string) => `${day} at 09:00`;

  it("names the teacher and the week that clashes", () => {
    const message = seriesConflictMessage("Marta", [label("Aug 31")]);

    expect(message).toContain("Marta");
    expect(message).toContain("Aug 31 at 09:00");
  });

  it("says plainly that nothing was created", () => {
    expect(seriesConflictMessage("Marta", [label("Aug 31")])).toContain("Nothing was created");
  });

  it("summarises the rest rather than listing every week", () => {
    const message = seriesConflictMessage(
      "Marta",
      ["Aug 17", "Aug 24", "Aug 31", "Sep 7", "Sep 14"].map(label)
    );

    expect(message).toContain("and 2 more");
    expect(message).not.toContain("Sep 14");
  });

  it("lists them all when there are few enough", () => {
    const message = seriesConflictMessage(
      "Marta",
      ["Aug 17", "Aug 24", "Aug 31"].map(label)
    );

    expect(message).not.toContain("more");
    expect(MAX_LISTED_SERIES_CONFLICTS).toBe(3);
  });

  it("stays in words a coordinator can act on", () => {
    const message = seriesConflictMessage("Marta", [label("Aug 31")]);

    expect(message).not.toMatch(/prisma|sql|transaction|overlap|predicate/i);
  });
});

/**
 * A series is allowed for exactly the same student and teacher a single class is:
 * the rule lives in one place and both flows call it.
 */
describe("who a series may be created for", () => {
  const candidate = (overrides?: {
    studentStatus?: "ACTIVE" | "TRIAL" | "PAUSED" | "ARCHIVED";
    teacherLanguageIds?: string[];
    teacherActive?: boolean;
  }) => ({
    student: {
      name: "Ana Ruiz",
      status: overrides?.studentStatus ?? ("ACTIVE" as const),
      languageId: "lang-en",
    },
    teacher: {
      name: "Marta Lopez",
      active: overrides?.teacherActive ?? true,
      languageIds: overrides?.teacherLanguageIds ?? ["lang-en"],
    },
    languageName: "English",
  });

  it("accepts an active or trial student with a teacher of their language", () => {
    expect(checkManualClassEligibility(candidate())).toEqual({ ok: true });
    expect(checkManualClassEligibility(candidate({ studentStatus: "TRIAL" }))).toEqual({
      ok: true,
    });
  });

  it("refuses a paused or archived student", () => {
    expect(checkManualClassEligibility(candidate({ studentStatus: "PAUSED" })).ok).toBe(false);
    expect(checkManualClassEligibility(candidate({ studentStatus: "ARCHIVED" })).ok).toBe(
      false
    );
  });

  it("refuses a teacher who does not teach the student's language", () => {
    expect(
      checkManualClassEligibility(candidate({ teacherLanguageIds: ["lang-fr"] })).ok
    ).toBe(false);
  });

  it("refuses an inactive teacher", () => {
    expect(checkManualClassEligibility(candidate({ teacherActive: false })).ok).toBe(false);
  });
});
