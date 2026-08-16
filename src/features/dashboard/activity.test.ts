import { describe, expect, it } from "vitest";
import { describeActivity, groupActivityByWeek, type ActivityInput } from "./activity";

// August 2026 begins on a Saturday, so its first week starts Monday July 27 —
// a deliberately awkward month for bucketing.
const MONTH_START = "2026-08-01";
const MONTH_END = "2026-08-31";

describe("groupActivityByWeek", () => {
  it("covers every week overlapping the month, including empty ones", () => {
    const weeks = groupActivityByWeek([], MONTH_START, MONTH_END);

    expect(weeks.map((week) => week.weekStart)).toEqual([
      "2026-07-27",
      "2026-08-03",
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
    ]);
    expect(weeks.every((week) => week.total === 0)).toBe(true);
  });

  it("counts each class into its Monday-started week, by status", () => {
    const classes: ActivityInput[] = [
      { date: "2026-08-03", status: "COMPLETED" },
      { date: "2026-08-05", status: "COMPLETED" },
      { date: "2026-08-06", status: "CANCELLED" },
      { date: "2026-08-11", status: "SCHEDULED" },
    ];

    const weeks = groupActivityByWeek(classes, MONTH_START, MONTH_END);
    const first = weeks.find((week) => week.weekStart === "2026-08-03");
    const second = weeks.find((week) => week.weekStart === "2026-08-10");

    expect(first).toMatchObject({ completed: 2, cancelled: 1, scheduled: 0, total: 3 });
    expect(second).toMatchObject({ scheduled: 1, total: 1 });
  });

  it("puts Aug 1, a Saturday, in the week beginning July 27", () => {
    const weeks = groupActivityByWeek(
      [{ date: "2026-08-01", status: "COMPLETED" }],
      MONTH_START,
      MONTH_END
    );

    expect(weeks[0]).toMatchObject({ weekStart: "2026-07-27", completed: 1, total: 1 });
  });

  it("ignores classes outside the month even when the first week reaches back", () => {
    // July 28 falls in the first bar's week but belongs to July.
    const weeks = groupActivityByWeek(
      [
        { date: "2026-07-28", status: "COMPLETED" },
        { date: "2026-09-02", status: "SCHEDULED" },
      ],
      MONTH_START,
      MONTH_END
    );

    expect(weeks.every((week) => week.total === 0)).toBe(true);
  });

  it("labels a bar by the day its week starts", () => {
    const weeks = groupActivityByWeek([], MONTH_START, MONTH_END);

    expect(weeks[0]?.label).toBe("Jul 27");
    expect(weeks[1]?.label).toBe("Aug 3");
  });

  it("keeps totals equal to the sum of the three statuses", () => {
    const weeks = groupActivityByWeek(
      [
        { date: "2026-08-10", status: "SCHEDULED" },
        { date: "2026-08-10", status: "COMPLETED" },
        { date: "2026-08-12", status: "CANCELLED" },
      ],
      MONTH_START,
      MONTH_END
    );

    for (const week of weeks) {
      expect(week.total).toBe(week.scheduled + week.completed + week.cancelled);
    }
  });
});

describe("describeActivity", () => {
  it("says plainly when a month has nothing", () => {
    expect(describeActivity(groupActivityByWeek([], MONTH_START, MONTH_END), "August")).toBe(
      "No classes recorded in August."
    );
  });

  it("summarises totals and names the busiest week", () => {
    const weeks = groupActivityByWeek(
      [
        { date: "2026-08-03", status: "COMPLETED" },
        { date: "2026-08-04", status: "COMPLETED" },
        { date: "2026-08-11", status: "SCHEDULED" },
        { date: "2026-08-12", status: "CANCELLED" },
      ],
      MONTH_START,
      MONTH_END
    );

    const summary = describeActivity(weeks, "August");

    expect(summary).toContain("4 classes");
    expect(summary).toContain("2 completed, 1 scheduled, 1 cancelled");
    expect(summary).toContain("Busiest week begins Aug 3 with 2");
  });
});
