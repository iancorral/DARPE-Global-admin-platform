import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUSINESS_HOURS,
  isOutsideBusinessHour,
  isOutsideBusinessHours,
} from "./business-hours";

describe("isOutsideBusinessHours", () => {
  it("treats a mid-morning class as inside the working day", () => {
    expect(isOutsideBusinessHours(10 * 60)).toBe(false);
  });

  it("includes the opening hour itself", () => {
    expect(isOutsideBusinessHours(8 * 60)).toBe(false);
  });

  it("marks an early class before opening", () => {
    // 07:00 for a student in another time zone.
    expect(isOutsideBusinessHours(7 * 60)).toBe(true);
    expect(isOutsideBusinessHours(7 * 60 + 30)).toBe(true);
  });

  it("marks a class starting exactly at closing time", () => {
    // 20:00 is when the day ends, so a class beginning then runs past it.
    expect(isOutsideBusinessHours(20 * 60)).toBe(true);
  });

  it("keeps the last half hour before closing inside", () => {
    expect(isOutsideBusinessHours(19 * 60 + 30)).toBe(false);
  });

  it("marks a late-evening class", () => {
    expect(isOutsideBusinessHours(21 * 60 + 30)).toBe(true);
  });

  it("accepts the academy's own hours, for a future Settings screen", () => {
    const nightSchool = { startHour: 14, endHour: 22 };

    expect(isOutsideBusinessHours(9 * 60, nightSchool)).toBe(true);
    expect(isOutsideBusinessHours(21 * 60, nightSchool)).toBe(false);
  });
});

describe("isOutsideBusinessHour", () => {
  it("marks the hour rows above and below the working day", () => {
    expect(isOutsideBusinessHour(7)).toBe(true);
    expect(isOutsideBusinessHour(8)).toBe(false);
    expect(isOutsideBusinessHour(19)).toBe(false);
    expect(isOutsideBusinessHour(20)).toBe(true);
  });
});

describe("DEFAULT_BUSINESS_HOURS", () => {
  it("is narrower than the hours the calendar shows, or nothing would be marked", () => {
    // The grid defaults to 07:00–22:00; the working day must sit inside it.
    expect(DEFAULT_BUSINESS_HOURS.startHour).toBeGreaterThan(7);
    expect(DEFAULT_BUSINESS_HOURS.endHour).toBeLessThan(22);
  });
});
