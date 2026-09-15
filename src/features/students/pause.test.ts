import { describe, expect, it } from "vitest";
import {
  PAUSE_ARCHIVE_DAYS,
  daysPaused,
  isArchivableFromPause,
  pausedAtForChange,
} from "./pause";

const NOW = new Date("2026-08-24T18:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

describe("pausedAtForChange", () => {
  it("stamps the date when a student is paused", () => {
    expect(pausedAtForChange("ACTIVE", "PAUSED", NOW)).toEqual(NOW);
  });

  it("leaves an already-paused student's date alone", () => {
    // Editing a paused student's phone number must not restart their month.
    expect(pausedAtForChange("PAUSED", "PAUSED", NOW)).toBeUndefined();
  });

  it("clears the date when a paused student comes back", () => {
    expect(pausedAtForChange("PAUSED", "ACTIVE", NOW)).toBeNull();
  });

  it("clears the date when a paused student is archived", () => {
    expect(pausedAtForChange("PAUSED", "ARCHIVED", NOW)).toBeNull();
  });

  it("touches nothing when the pause is not involved", () => {
    expect(pausedAtForChange("ACTIVE", "ARCHIVED", NOW)).toBeUndefined();
    expect(pausedAtForChange("ARCHIVED", "ACTIVE", NOW)).toBeUndefined();
  });
});

describe("isArchivableFromPause", () => {
  it("is true once the pause reaches a month", () => {
    expect(isArchivableFromPause("PAUSED", daysAgo(PAUSE_ARCHIVE_DAYS), NOW)).toBe(true);
    expect(isArchivableFromPause("PAUSED", daysAgo(45), NOW)).toBe(true);
  });

  it("is false a day short", () => {
    expect(isArchivableFromPause("PAUSED", daysAgo(PAUSE_ARCHIVE_DAYS - 1), NOW)).toBe(false);
  });

  it("is false for a paused student whose pause predates the field", () => {
    expect(isArchivableFromPause("PAUSED", null, NOW)).toBe(false);
  });

  it("never applies to a student who is not paused", () => {
    expect(isArchivableFromPause("ACTIVE", daysAgo(90), NOW)).toBe(false);
    expect(isArchivableFromPause("ARCHIVED", daysAgo(90), NOW)).toBe(false);
  });
});

describe("daysPaused", () => {
  it("counts whole days", () => {
    expect(daysPaused(daysAgo(31), NOW)).toBe(31);
  });

  it("is zero on the day of the pause", () => {
    expect(daysPaused(NOW, NOW)).toBe(0);
  });
});
