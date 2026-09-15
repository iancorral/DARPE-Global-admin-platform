import { describe, expect, it } from "vitest";
import { displayDate, monthGrid, monthLabel, monthStart, shiftMonth } from "./month-grid";

describe("monthGrid", () => {
  it("always returns six weeks, so the picker never changes height", () => {
    expect(monthGrid("2026-08-15")).toHaveLength(42);
    expect(monthGrid("2026-02-01")).toHaveLength(42);
  });

  it("starts on the Sunday on or before the first of the month", () => {
    // 2026-08-01 is a Saturday, so the grid opens on 2026-07-26.
    expect(monthGrid("2026-08-15")[0]).toEqual({ date: "2026-07-26", inMonth: false });
  });

  it("marks which cells belong to the month being shown", () => {
    const cells = monthGrid("2026-08-15");
    const inMonth = cells.filter((cell) => cell.inMonth);

    expect(inMonth).toHaveLength(31);
    expect(inMonth[0]?.date).toBe("2026-08-01");
    expect(inMonth[30]?.date).toBe("2026-08-31");
  });

  it("gives the same grid for any day of the same month", () => {
    expect(monthGrid("2026-08-01")).toEqual(monthGrid("2026-08-31"));
  });

  it("handles a month that starts on a Sunday without a blank week", () => {
    // 2026-03-01 is a Sunday.
    expect(monthGrid("2026-03-10")[0]).toEqual({ date: "2026-03-01", inMonth: true });
  });

  it("counts February's days correctly in a leap year", () => {
    expect(monthGrid("2028-02-10").filter((cell) => cell.inMonth)).toHaveLength(29);
  });
});

describe("shiftMonth", () => {
  it("moves forward and back within a year", () => {
    expect(shiftMonth("2026-08-15", 1)).toBe("2026-09-01");
    expect(shiftMonth("2026-08-15", -1)).toBe("2026-07-01");
  });

  it("crosses the year boundary in both directions", () => {
    expect(shiftMonth("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftMonth("2026-01-01", -1)).toBe("2025-12-01");
  });

  it("crosses several years at once", () => {
    expect(shiftMonth("2026-06-01", -18)).toBe("2024-12-01");
  });
});

describe("monthStart", () => {
  it("pads single-digit months", () => {
    expect(monthStart(2026, 3)).toBe("2026-03-01");
  });
});

describe("labels", () => {
  it("names the month and year", () => {
    expect(monthLabel("2026-08-15")).toBe("August 2026");
  });

  it("writes a date so the day and month cannot be confused", () => {
    expect(displayDate("2026-08-29")).toBe("29 Aug 2026");
    expect(displayDate("2026-01-05")).toBe("5 Jan 2026");
  });
});
