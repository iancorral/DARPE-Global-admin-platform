import { describe, expect, it } from "vitest";
import {
  financeMonthNav,
  monthParam,
  monthStartOf,
  monthsEndingAt,
  selectedMonthStart,
  shiftMonthStart,
} from "./months";

const SEPTEMBER = "2026-09-01";

describe("shiftMonthStart", () => {
  it("moves forward and back within a year", () => {
    expect(shiftMonthStart(SEPTEMBER, 1)).toBe("2026-10-01");
    expect(shiftMonthStart(SEPTEMBER, -1)).toBe("2026-08-01");
  });

  it("crosses a year end in both directions", () => {
    expect(shiftMonthStart("2026-12-01", 1)).toBe("2027-01-01");
    expect(shiftMonthStart("2026-01-01", -1)).toBe("2025-12-01");
    expect(shiftMonthStart("2026-01-01", -13)).toBe("2024-12-01");
  });

  it("is its own inverse", () => {
    expect(shiftMonthStart(shiftMonthStart(SEPTEMBER, -5), 5)).toBe(SEPTEMBER);
  });
});

describe("monthsEndingAt", () => {
  it("ends at the month asked for, oldest first", () => {
    expect(monthsEndingAt(SEPTEMBER, 6)).toEqual([
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
    ]);
  });
});

describe("financeMonthNav", () => {
  const bounds = { earliestMonthStart: "2026-06-01", latestMonthStart: "2026-09-01" };

  it("offers both directions in the middle of the range", () => {
    expect(
      financeMonthNav({ selected: "2026-07-01", currentMonthStart: SEPTEMBER, ...bounds })
    ).toEqual({ previous: "2026-06-01", next: "2026-08-01" });
  });

  it("stops going back at the first month that holds a payment", () => {
    expect(
      financeMonthNav({ selected: "2026-06-01", currentMonthStart: SEPTEMBER, ...bounds })
        .previous
    ).toBeNull();
  });

  it("stops going forward at the current month", () => {
    expect(
      financeMonthNav({ selected: SEPTEMBER, currentMonthStart: SEPTEMBER, ...bounds }).next
    ).toBeNull();
  });

  it("reaches a payment dated into the future rather than hiding it", () => {
    expect(
      financeMonthNav({
        selected: SEPTEMBER,
        currentMonthStart: SEPTEMBER,
        earliestMonthStart: "2026-06-01",
        latestMonthStart: "2026-11-01",
      }).next
    ).toBe("2026-10-01");
  });

  it("offers nothing at all when no payment has ever been recorded", () => {
    expect(
      financeMonthNav({
        selected: SEPTEMBER,
        currentMonthStart: SEPTEMBER,
        earliestMonthStart: null,
        latestMonthStart: null,
      })
    ).toEqual({ previous: null, next: null });
  });
});

describe("selectedMonthStart", () => {
  it("reads a month out of the address bar", () => {
    expect(selectedMonthStart("2026-08", SEPTEMBER)).toBe("2026-08-01");
  });

  it("falls back to the current month rather than failing on nonsense", () => {
    for (const bad of [undefined, "", "2026", "2026-13", "2026-00", "august", "2026-8"]) {
      expect(selectedMonthStart(bad, SEPTEMBER)).toBe(SEPTEMBER);
    }
  });
});

describe("monthStartOf and monthParam", () => {
  it("round-trips a date through the address bar", () => {
    const monthStart = monthStartOf("2026-08-27");

    expect(monthStart).toBe("2026-08-01");
    expect(monthParam(monthStart)).toBe("2026-08");
    expect(selectedMonthStart(monthParam(monthStart), SEPTEMBER)).toBe(monthStart);
  });
});
