import { describe, expect, it } from "vitest";
import {
  OVERDUE_WINDOW_MINUTES,
  certainlyEndedBefore,
  classEndsAt,
  hasFullyEnded,
} from "./overdue";

const NOW = new Date("2026-08-15T18:00:00Z");

/** A class of `durationMinutes` starting `minutesAgo` before NOW. */
function session(minutesAgo: number, durationMinutes: number) {
  return {
    startsAt: new Date(NOW.getTime() - minutesAgo * 60_000),
    durationMinutes,
  };
}

describe("classEndsAt", () => {
  it("adds the duration to the start", () => {
    expect(classEndsAt(new Date("2026-08-15T14:00:00Z"), 90).toISOString()).toBe(
      "2026-08-15T15:30:00.000Z"
    );
  });
});

describe("hasFullyEnded", () => {
  it("is false while the class is still running", () => {
    // Started 30 minutes ago, runs an hour: half of it is still ahead.
    expect(hasFullyEnded(session(30, 60), NOW)).toBe(false);
  });

  it("is false one minute before the end", () => {
    expect(hasFullyEnded(session(59, 60), NOW)).toBe(false);
  });

  it("is true at the exact moment the class ends", () => {
    expect(hasFullyEnded(session(60, 60), NOW)).toBe(true);
  });

  it("is true once the class is over", () => {
    expect(hasFullyEnded(session(61, 60), NOW)).toBe(true);
  });

  it("is false for a class that has not started", () => {
    expect(hasFullyEnded(session(-30, 60), NOW)).toBe(false);
  });

  it("catches an earlier class from the same day, not only older ones", () => {
    // 09:00 class, 60 minutes, judged at 18:00 the same day.
    expect(hasFullyEnded(session(9 * 60, 60), NOW)).toBe(true);
  });

  it("respects a long class that started well before now", () => {
    // Started four hours ago but runs five: not over yet.
    expect(hasFullyEnded(session(240, 300), NOW)).toBe(false);
  });
});

describe("certainlyEndedBefore", () => {
  it("is a full day behind now", () => {
    expect(certainlyEndedBefore(NOW).toISOString()).toBe("2026-08-14T18:00:00.000Z");
    expect(OVERDUE_WINDOW_MINUTES).toBe(1440);
  });

  it("bounds the window: anything starting before it has ended", () => {
    const cutoff = certainlyEndedBefore(NOW);
    // The longest class the scheduling form allows is far shorter than the
    // window, so a class starting a minute before the cutoff is always over.
    const justBefore = { startsAt: new Date(cutoff.getTime() - 60_000), durationMinutes: 240 };

    expect(hasFullyEnded(justBefore, NOW)).toBe(true);
  });
});
