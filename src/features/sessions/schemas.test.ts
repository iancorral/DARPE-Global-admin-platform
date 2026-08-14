import { describe, expect, it } from "vitest";
import { scheduleSlotSchema } from "@/features/schedules/schemas";
import {
  ALIGNED_START_MESSAGE,
  createSessionSchema,
  firstValidationMessage,
  updateSessionSchedulingSchema,
} from "./schemas";

/**
 * The alignment rule as the server applies it, rather than as the forms offer it.
 * A server action is reachable without the UI, so these are the checks that
 * actually decide what may be stored.
 */

const newClass = (startTime: string) => ({
  studentId: "student-1",
  teacherId: "teacher-1",
  date: "2026-08-17",
  startTime,
  durationMinutes: 60,
});

const newSlot = (startTime: string) => ({
  studentId: "student-1",
  teacherId: "teacher-1",
  weekday: 1,
  startTime,
  durationMinutes: 60,
  startsOn: "2026-08-17",
});

describe("createSessionSchema start time", () => {
  it("accepts a class on the hour", () => {
    expect(createSessionSchema.safeParse(newClass("09:00")).success).toBe(true);
  });

  it("accepts a class on the half hour", () => {
    expect(createSessionSchema.safeParse(newClass("09:30")).success).toBe(true);
  });

  it("rejects a quarter past", () => {
    const result = createSessionSchema.safeParse(newClass("09:15"));

    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0]?.message).toBe(
      ALIGNED_START_MESSAGE
    );
  });

  it("rejects a quarter to", () => {
    expect(createSessionSchema.safeParse(newClass("09:45")).success).toBe(false);
  });

  it("still rejects a time that is not a time at all", () => {
    expect(createSessionSchema.safeParse(newClass("9:00")).success).toBe(false);
    expect(createSessionSchema.safeParse(newClass("25:00")).success).toBe(false);
  });

  it("explains the rule in words a coordinator can act on", () => {
    expect(ALIGNED_START_MESSAGE).toContain(":00");
    expect(ALIGNED_START_MESSAGE).toContain(":30");
    expect(ALIGNED_START_MESSAGE).not.toMatch(/interval|modulo|schema|regex/i);
  });
});

describe("scheduleSlotSchema start time", () => {
  it("accepts a recurring slot on the hour and the half hour", () => {
    expect(scheduleSlotSchema.safeParse(newSlot("07:00")).success).toBe(true);
    expect(scheduleSlotSchema.safeParse(newSlot("07:30")).success).toBe(true);
  });

  it("rejects a recurring slot at a quarter past or to", () => {
    expect(scheduleSlotSchema.safeParse(newSlot("07:15")).success).toBe(false);
    expect(scheduleSlotSchema.safeParse(newSlot("07:45")).success).toBe(false);
  });

  it("gives the same reason as a manual class, because it is the same rule", () => {
    const result = scheduleSlotSchema.safeParse(newSlot("07:15"));

    expect(result.success === false && result.error.issues[0]?.message).toBe(
      ALIGNED_START_MESSAGE
    );
  });
});

describe("updateSessionSchedulingSchema", () => {
  const edit = (startTime: string) => ({
    id: "session-1",
    teacherId: "teacher-1",
    date: "2026-08-17",
    startTime,
    durationMinutes: 60,
  });

  it("does not judge alignment on its own", () => {
    // It cannot: whether 08:15 is allowed depends on the time the stored class
    // already has, which the action reads back and checks with
    // isStartTimeChangeAllowed.
    expect(updateSessionSchedulingSchema.safeParse(edit("08:15")).success).toBe(true);
  });

  it("still enforces the shape of a wall-clock time", () => {
    expect(updateSessionSchedulingSchema.safeParse(edit("8:15")).success).toBe(false);
  });

  it("still accepts a duration a legacy recurring slot may have produced", () => {
    expect(
      updateSessionSchedulingSchema.safeParse({ ...edit("09:00"), durationMinutes: 75 }).success
    ).toBe(true);
  });
});

describe("firstValidationMessage", () => {
  it("reports why the input was refused", () => {
    const result = createSessionSchema.safeParse(newClass("09:15"));

    expect(
      result.success === false && firstValidationMessage(result.error, "fallback")
    ).toBe(ALIGNED_START_MESSAGE);
  });

  it("names the missing field rather than describing the data shape", () => {
    const result = createSessionSchema.safeParse({ ...newClass("09:00"), studentId: "" });

    expect(
      result.success === false && firstValidationMessage(result.error, "fallback")
    ).toBe("Select a student");
  });

  it("says nothing about the database or the shape of the data", () => {
    // Every issue, not just the first: any field missing its own message would
    // fall back to Zod's default, which describes the data rather than the mistake.
    const schemas = [
      createSessionSchema.safeParse({}),
      scheduleSlotSchema.safeParse({}),
    ];

    for (const result of schemas) {
      expect(result.success).toBe(false);

      for (const issue of result.success === false ? result.error.issues : []) {
        expect(issue.message).not.toMatch(
          /prisma|sql|column|table|undefined|expected|received|invalid input/i
        );
      }
    }
  });
});
