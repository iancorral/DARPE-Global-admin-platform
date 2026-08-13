import { describe, expect, it } from "vitest";
import {
  SNAP_MINUTES,
  buildSchedulingUpdate,
  calendarUrl,
  classifyDestination,
  formatSlotTime,
  minutesFromOffset,
  offsetFromMinutes,
  slotStarts,
  snapToSlot,
} from "./scheduling";

describe("snapToSlot", () => {
  it("snaps to quarter hours", () => {
    expect(SNAP_MINUTES).toBe(15);
    expect(snapToSlot(540)).toBe(540);
    expect(snapToSlot(547)).toBe(540);
    expect(snapToSlot(548)).toBe(555);
    expect(snapToSlot(552)).toBe(555);
  });

  it("sends each position to the nearer edge, splitting at half a slot", () => {
    expect(snapToSlot(7)).toBe(0);
    expect(snapToSlot(8)).toBe(15);
  });

  it("never lands before midnight", () => {
    expect(snapToSlot(-30)).toBe(0);
  });
});

describe("minutesFromOffset", () => {
  const dayStart = 8 * 60;
  const pixelsPerHour = 80;

  it("maps the top of the grid to the first visible hour", () => {
    expect(minutesFromOffset(0, dayStart, pixelsPerHour)).toBe(480);
  });

  it("maps a full hour of pixels to a full hour", () => {
    expect(minutesFromOffset(80, dayStart, pixelsPerHour)).toBe(540);
  });

  it("snaps a position between slots to the nearest quarter hour", () => {
    // 26px ≈ 19.5 minutes past 08:00, which is nearer 08:15 than 08:30.
    expect(minutesFromOffset(26, dayStart, pixelsPerHour)).toBe(495);
  });

  it("round-trips with offsetFromMinutes", () => {
    const minutes = minutesFromOffset(120, dayStart, pixelsPerHour);
    expect(offsetFromMinutes(minutes, dayStart, pixelsPerHour)).toBe(120);
  });
});

describe("offsetFromMinutes", () => {
  it("places a start time proportionally inside the grid", () => {
    expect(offsetFromMinutes(9 * 60, 8 * 60, 80)).toBe(80);
    expect(offsetFromMinutes(8 * 60 + 15, 8 * 60, 80)).toBe(20);
  });
});

describe("slotStarts", () => {
  it("offers every quarter hour the class still fits inside", () => {
    // 09:00 is excluded: a 15-minute class starting there would run past the
    // last visible hour.
    const starts = slotStarts(8, 9, 15);

    expect(starts).toEqual([480, 495, 510, 525]);
  });

  it("stops early enough that the class still fits before the last hour", () => {
    const starts = slotStarts(8, 9, 60);

    expect(starts).toEqual([480]);
  });

  it("offers nothing when the class is longer than the visible range", () => {
    expect(slotStarts(8, 9, 120)).toEqual([]);
  });
});

describe("classifyDestination", () => {
  const candidate = (startMinutes: number, durationMinutes = 60) => ({
    startMinutes,
    durationMinutes,
  });

  it("marks the class's current time as the original position", () => {
    expect(classifyDestination(candidate(540), [], 540)).toBe("original");
  });

  it("marks a free slot as free", () => {
    expect(classifyDestination(candidate(540), [], null)).toBe("free");
  });

  it("marks a slot the teacher is already busy in as a conflict", () => {
    expect(classifyDestination(candidate(540), [candidate(510)], null)).toBe("conflict");
  });

  it("allows back-to-back classes", () => {
    expect(classifyDestination(candidate(540), [candidate(480)], null)).toBe("free");
    expect(classifyDestination(candidate(540), [candidate(600)], null)).toBe("free");
  });

  it("prefers the original label over a conflict with the class's own time", () => {
    expect(classifyDestination(candidate(540), [candidate(540)], 540)).toBe("original");
  });

  it("ignores days the class does not currently sit on", () => {
    expect(classifyDestination(candidate(540), [], null)).toBe("free");
  });
});

describe("formatSlotTime", () => {
  it("renders minutes as a wall-clock time the server accepts", () => {
    expect(formatSlotTime(0)).toBe("00:00");
    expect(formatSlotTime(495)).toBe("08:15");
    expect(formatSlotTime(1425)).toBe("23:45");
  });
});

describe("buildSchedulingUpdate", () => {
  const startsAt = new Date("2026-08-20T15:00:00Z");
  const update = buildSchedulingUpdate({
    startsAt,
    durationMinutes: 60,
    teacherId: "teacher-2",
  });

  it("writes only the time, duration and teacher", () => {
    expect(Object.keys(update).sort()).toEqual(["durationMinutes", "startsAt", "teacherId"]);
  });

  it("never touches the recurring occurrence a generated class belongs to", () => {
    expect(update).not.toHaveProperty("scheduleSlotId");
    expect(update).not.toHaveProperty("slotOccurrenceOn");
  });

  it("never reaches the recurring slot or the student's primary teacher", () => {
    expect(update).not.toHaveProperty("scheduleSlot");
    expect(update).not.toHaveProperty("student");
    expect(update).not.toHaveProperty("primaryTeacherId");
  });

  it("carries the requested values through", () => {
    expect(update.startsAt).toBe(startsAt);
    expect(update.durationMinutes).toBe(60);
    expect(update.teacherId).toBe("teacher-2");
  });
});

describe("calendarUrl", () => {
  it("keeps move mode in the url so it survives changing week", () => {
    expect(calendarUrl({ week: "2026-08-17", moving: "abc" })).toBe(
      "/calendar?week=2026-08-17&moving=abc"
    );
  });

  it("keeps the teacher filter alongside an active move", () => {
    expect(calendarUrl({ week: "2026-08-17", teacher: "t1", moving: "abc" })).toBe(
      "/calendar?week=2026-08-17&teacher=t1&moving=abc"
    );
  });

  it("drops move mode when it is not passed, which is how a move is cancelled", () => {
    expect(calendarUrl({ week: "2026-08-17", teacher: "t1" })).toBe(
      "/calendar?week=2026-08-17&teacher=t1"
    );
  });
});
