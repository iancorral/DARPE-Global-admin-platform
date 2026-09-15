import { describe, expect, it } from "vitest";
import { weekPagerLinks } from "./week-pager";

/** The week of Monday 2026-09-14, the week DARPE's imported timetable starts. */
const WEEK = "2026-09-14";

describe("weekPagerLinks", () => {
  it("steps a whole week back and forward, across a month boundary", () => {
    const links = weekPagerLinks({ weekStart: "2026-10-05", todayWeekStart: WEEK });

    expect(links.previous).toBe("/calendar?week=2026-09-28");
    expect(links.next).toBe("/calendar?week=2026-10-12");
  });

  it("steps across a year boundary rather than clamping inside the year", () => {
    const links = weekPagerLinks({ weekStart: "2026-12-28", todayWeekStart: WEEK });

    expect(links.next).toBe("/calendar?week=2027-01-04");
  });

  it("reaches past weeks, which is the whole point of the back arrow", () => {
    const links = weekPagerLinks({ weekStart: WEEK, todayWeekStart: WEEK });

    expect(links.previous).toBe("/calendar?week=2026-09-07");
  });

  it("says whether the week on screen is today's", () => {
    expect(weekPagerLinks({ weekStart: WEEK, todayWeekStart: WEEK }).isOnTodaysWeek).toBe(
      true
    );
    expect(
      weekPagerLinks({ weekStart: "2026-09-21", todayWeekStart: WEEK }).isOnTodaysWeek
    ).toBe(false);
  });

  it("points 'back to this week' at today's week from anywhere", () => {
    expect(weekPagerLinks({ weekStart: "2027-03-01", todayWeekStart: WEEK }).today).toBe(
      "/calendar?week=2026-09-14"
    );
  });

  it("carries the teacher filter and an open move through every link", () => {
    const links = weekPagerLinks({
      weekStart: WEEK,
      todayWeekStart: WEEK,
      teacherId: "teacher-1",
      movingId: "session-9",
    });

    for (const href of [links.previous, links.next, links.today]) {
      expect(href).toContain("teacher=teacher-1");
      expect(href).toContain("moving=session-9");
    }
  });

  it("leaves the filter out entirely when there is none", () => {
    const links = weekPagerLinks({ weekStart: WEEK, todayWeekStart: WEEK });

    expect(links.next).not.toContain("teacher");
    expect(links.next).not.toContain("moving");
  });
});
