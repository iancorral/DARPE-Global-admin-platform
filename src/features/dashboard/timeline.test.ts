import { describe, expect, it } from "vitest";
import { groupByDay, timelinePhases, type TimelineSession } from "./timeline";

const HOUR = 60 * 60 * 1000;

function at(startHour: number, status: TimelineSession["status"] = "SCHEDULED"): TimelineSession {
  return { startsAtMs: startHour * HOUR, endsAtMs: (startHour + 1) * HOUR, status };
}

describe("timelinePhases", () => {
  it("splits the day into ended, running, the next one and the rest", () => {
    const sessions = [at(8), at(10), at(12), at(14)];

    expect(timelinePhases(sessions, 10.5 * HOUR)).toEqual(["past", "now", "next", "later"]);
  });

  it("marks only one class as next", () => {
    expect(timelinePhases([at(12), at(12), at(13)], 9 * HOUR)).toEqual([
      "next",
      "later",
      "later",
    ]);
  });

  it("treats the exact end as ended and the exact start as running", () => {
    expect(timelinePhases([at(8), at(9)], 9 * HOUR)).toEqual(["past", "now"]);
  });

  it("never offers a cancelled class as running or next", () => {
    expect(timelinePhases([at(9, "CANCELLED"), at(11, "CANCELLED"), at(12)], 9.5 * HOUR)).toEqual(
      ["past", "later", "next"]
    );
  });

  it("has nothing next once the day is over", () => {
    expect(timelinePhases([at(8), at(9)], 23 * HOUR)).toEqual(["past", "past"]);
  });
});

describe("groupByDay", () => {
  it("keeps runs of the same day together, in order", () => {
    const rows = [
      { id: 1, dateLabel: "Mon, Sep 14" },
      { id: 2, dateLabel: "Mon, Sep 14" },
      { id: 3, dateLabel: "Tue, Sep 15" },
    ];

    expect(groupByDay(rows)).toEqual([
      { dateLabel: "Mon, Sep 14", rows: [rows[0], rows[1]] },
      { dateLabel: "Tue, Sep 15", rows: [rows[2]] },
    ]);
  });

  it("returns nothing for nothing", () => {
    expect(groupByDay([])).toEqual([]);
  });
});
