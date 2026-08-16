import { describe, expect, it } from "vitest";
import { ALIGNED_START_MESSAGE, firstValidationMessage } from "@/features/sessions/schemas";
import { MAX_SERIES_WEEKS } from "./series";
import { endSeriesSchema, updateSeriesSchema, weeklySeriesSchema } from "./schemas";

/**
 * What the server will accept as a weekly series. The dialog only offers valid
 * input, but the action is reachable without it, so this is the real gate.
 */

const validSeries = {
  studentId: "student-1",
  teacherId: "teacher-1",
  startsOn: "2026-08-17",
  endsOn: "2026-09-13",
  startTime: "09:00",
  durationMinutes: 60,
};

const series = (overrides?: Partial<typeof validSeries> & Record<string, unknown>) => ({
  ...validSeries,
  ...overrides,
});

describe("weeklySeriesSchema", () => {
  it("accepts a four-week series from a calendar position", () => {
    expect(weeklySeriesSchema.safeParse(series()).success).toBe(true);
  });

  it("requires an end date, because a calendar series never runs forever", () => {
    expect(weeklySeriesSchema.safeParse({ ...validSeries, endsOn: undefined }).success).toBe(
      false
    );
    expect(weeklySeriesSchema.safeParse(series({ endsOn: "" })).success).toBe(false);
  });

  it("rejects an end date before the first class", () => {
    const result = weeklySeriesSchema.safeParse(series({ endsOn: "2026-08-16" }));

    expect(result.success).toBe(false);
    expect(result.success === false && firstValidationMessage(result.error, "fallback")).toBe(
      "The last class cannot be before the first one"
    );
  });

  it("accepts a series of one, which ends the day it starts", () => {
    expect(weeklySeriesSchema.safeParse(series({ endsOn: validSeries.startsOn })).success).toBe(
      true
    );
  });

  it("rejects a start time off the hour and half hour, with the shared reason", () => {
    const result = weeklySeriesSchema.safeParse(series({ startTime: "09:15" }));

    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0]?.message).toBe(
      ALIGNED_START_MESSAGE
    );
  });

  it("rejects a duration the calendar does not offer", () => {
    expect(weeklySeriesSchema.safeParse(series({ durationMinutes: 75 })).success).toBe(false);
    expect(weeklySeriesSchema.safeParse(series({ durationMinutes: 90 })).success).toBe(true);
  });

  it("rejects a date that only looks like one", () => {
    expect(weeklySeriesSchema.safeParse(series({ startsOn: "2026-02-31" })).success).toBe(
      false
    );
    expect(weeklySeriesSchema.safeParse(series({ endsOn: "17/08/2026" })).success).toBe(false);
  });

  it("rejects a series longer than the guard allows", () => {
    const result = weeklySeriesSchema.safeParse(series({ endsOn: "2030-01-01" }));

    expect(result.success).toBe(false);
    expect(result.success === false && firstValidationMessage(result.error, "fallback")).toContain(
      `${MAX_SERIES_WEEKS} weeks`
    );
  });

  it("requires a student and a teacher, and says which is missing", () => {
    const result = weeklySeriesSchema.safeParse(series({ studentId: "" }));

    expect(result.success === false && firstValidationMessage(result.error, "fallback")).toBe(
      "Select a student"
    );
  });

  it("ignores a weekday sent by the client, because the server derives it", () => {
    const result = weeklySeriesSchema.safeParse(series({ weekday: 3 }));

    expect(result.success).toBe(true);
    expect(result.success && result.data).not.toHaveProperty("weekday");
  });

  it("ignores a language, an occurrence list and a label sent by the client", () => {
    const result = weeklySeriesSchema.safeParse(
      series({
        languageId: "lang-fr",
        occurrences: ["2026-08-17", "2026-12-25"],
        dayLabel: "Mon 17",
        active: false,
      })
    );

    expect(result.success).toBe(true);
    expect(Object.keys(result.success ? result.data : {}).sort()).toEqual([
      "durationMinutes",
      "endsOn",
      "startTime",
      "startsOn",
      "studentId",
      "teacherId",
    ]);
  });

  it("says nothing about the database or the shape of the data when it refuses", () => {
    const result = weeklySeriesSchema.safeParse({});

    expect(result.success).toBe(false);

    for (const issue of result.success === false ? result.error.issues : []) {
      expect(issue.message).not.toMatch(
        /prisma|sql|column|table|undefined|expected|received|invalid input/i
      );
    }
  });
});

/**
 * Replacing a series from one class onward. The cutoff is deliberately absent:
 * the server reads it from the selected class, so a client cannot choose which
 * week of history a change starts from.
 */
const validUpdate = {
  id: "session-1",
  teacherId: "teacher-1",
  startsOn: "2026-08-17",
  endsOn: "2026-09-13",
  startTime: "09:00",
  durationMinutes: 60,
};

const update = (overrides?: Partial<typeof validUpdate> & Record<string, unknown>) => ({
  ...validUpdate,
  ...overrides,
});

describe("updateSeriesSchema", () => {
  it("accepts a finite replacement series", () => {
    expect(updateSeriesSchema.safeParse(update()).success).toBe(true);
  });

  it("requires an end date, so an open-ended pattern cannot stay open-ended", () => {
    expect(updateSeriesSchema.safeParse({ ...validUpdate, endsOn: undefined }).success).toBe(
      false
    );
    expect(updateSeriesSchema.safeParse(update({ endsOn: "" })).success).toBe(false);
  });

  it("bounds the replacement by the same maximum span as a new series", () => {
    const result = updateSeriesSchema.safeParse(update({ endsOn: "2030-01-01" }));

    expect(result.success).toBe(false);
    expect(result.success === false && firstValidationMessage(result.error, "fallback")).toContain(
      `${MAX_SERIES_WEEKS} weeks`
    );
  });

  it("rejects an end date before the new first class", () => {
    expect(updateSeriesSchema.safeParse(update({ endsOn: "2026-08-16" })).success).toBe(false);
  });

  it("holds new times to the shared scheduling interval", () => {
    const result = updateSeriesSchema.safeParse(update({ startTime: "09:15" }));

    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0]?.message).toBe(
      ALIGNED_START_MESSAGE
    );
  });

  it("takes only the fields the server acts on, ignoring a client-sent cutoff", () => {
    const result = updateSeriesSchema.safeParse(
      update({ cutoffOn: "2020-01-01", scheduleSlotId: "slot-9", weekday: 3, studentId: "x" })
    );

    expect(result.success).toBe(true);
    expect(Object.keys(result.success ? result.data : {}).sort()).toEqual([
      "durationMinutes",
      "endsOn",
      "id",
      "startTime",
      "startsOn",
      "teacherId",
    ]);
  });
});

describe("endSeriesSchema", () => {
  it("needs only the class to end from", () => {
    expect(endSeriesSchema.safeParse({ id: "session-1" }).success).toBe(true);
    expect(endSeriesSchema.safeParse({ id: "" }).success).toBe(false);
  });

  it("ignores anything else a client sends", () => {
    const result = endSeriesSchema.safeParse({ id: "session-1", cutoffOn: "2020-01-01" });

    expect(result.success && Object.keys(result.data)).toEqual(["id"]);
  });
});
