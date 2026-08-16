import { describe, expect, it } from "vitest";
import { dashboardWindows } from "./windows";

// America/Chihuahua is UTC-6 with no daylight saving since 2022, so the
// expected instants can be written down exactly.
const TZ = "America/Chihuahua";

describe("dashboardWindows", () => {
  it("computes today's boundaries in the academy timezone", () => {
    // 12:00 UTC = 06:00 in Chihuahua, same calendar date.
    const windows = dashboardWindows(new Date("2026-08-15T12:00:00Z"), TZ);

    expect(windows.todayDate).toBe("2026-08-15");
    expect(windows.todayStart.toISOString()).toBe("2026-08-15T06:00:00.000Z");
    expect(windows.tomorrowStart.toISOString()).toBe("2026-08-16T06:00:00.000Z");
  });

  it("uses the academy date, not the UTC date, near midnight", () => {
    // 03:00 UTC on the 15th is still 21:00 on the 14th in Chihuahua.
    const windows = dashboardWindows(new Date("2026-08-15T03:00:00Z"), TZ);

    expect(windows.todayDate).toBe("2026-08-14");
    expect(windows.todayStart.toISOString()).toBe("2026-08-14T06:00:00.000Z");
  });

  it("starts the week on the academy Monday", () => {
    // 2026-08-15 is a Saturday; its week began Monday 2026-08-10.
    const windows = dashboardWindows(new Date("2026-08-15T12:00:00Z"), TZ);

    expect(windows.weekStartDate).toBe("2026-08-10");
    expect(windows.weekStart.toISOString()).toBe("2026-08-10T06:00:00.000Z");
    expect(windows.nextWeekStart.toISOString()).toBe("2026-08-17T06:00:00.000Z");
  });

  it("treats a Monday as its own week start", () => {
    const windows = dashboardWindows(new Date("2026-08-10T12:00:00Z"), TZ);

    expect(windows.weekStartDate).toBe("2026-08-10");
  });

  it("keeps the week of a Sunday anchored to the previous Monday", () => {
    const windows = dashboardWindows(new Date("2026-08-16T12:00:00Z"), TZ);

    expect(windows.todayDate).toBe("2026-08-16");
    expect(windows.weekStartDate).toBe("2026-08-10");
  });

  it("spans the academy month", () => {
    const windows = dashboardWindows(new Date("2026-08-15T12:00:00Z"), TZ);

    expect(windows.monthStartDate).toBe("2026-08-01");
    expect(windows.monthStart.toISOString()).toBe("2026-08-01T06:00:00.000Z");
    expect(windows.nextMonthStart.toISOString()).toBe("2026-09-01T06:00:00.000Z");
  });

  it("rolls the month window over the end of the year", () => {
    const windows = dashboardWindows(new Date("2026-12-20T12:00:00Z"), TZ);

    expect(windows.monthStartDate).toBe("2026-12-01");
    expect(windows.nextMonthStart.toISOString()).toBe("2027-01-01T06:00:00.000Z");
  });

  it("uses the academy month near midnight on the first of a month", () => {
    // 03:00 UTC on Sep 1 is still 21:00 on Aug 31 in Chihuahua, so the month
    // window must still be August.
    const windows = dashboardWindows(new Date("2026-09-01T03:00:00Z"), TZ);

    expect(windows.todayDate).toBe("2026-08-31");
    expect(windows.monthStartDate).toBe("2026-08-01");
    expect(windows.nextMonthStart.toISOString()).toBe("2026-09-01T06:00:00.000Z");
  });
});
