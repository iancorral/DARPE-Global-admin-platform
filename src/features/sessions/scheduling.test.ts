import { describe, expect, it } from "vitest";
import {
  SCHEDULING_INTERVAL_MINUTES,
  buildAgendaRows,
  buildSchedulingUpdate,
  calendarMode,
  calendarUrl,
  classifyDestination,
  creationInputFor,
  creationStarts,
  endTimeLabel,
  formatSlotTime,
  initialAgendaScrollMinutes,
  intervalStart,
  isAlignedStart,
  isAlignedStartTime,
  isPositionCovered,
  isStartTimeChangeAllowed,
  moveGridFocus,
  occupiedOnDate,
  offersCreation,
  offersMoveDestinations,
  offsetFromMinutes,
  parseWallClockMinutes,
  slotStarts,
  startTimeOptions,
} from "./scheduling";

describe("the scheduling interval", () => {
  it("is half an hour, which is what every new selection snaps to", () => {
    expect(SCHEDULING_INTERVAL_MINUTES).toBe(30);
  });

  it("recognises the starts a selection may land on", () => {
    expect(isAlignedStart(9 * 60)).toBe(true);
    expect(isAlignedStart(9 * 60 + 30)).toBe(true);
    expect(isAlignedStart(9 * 60 + 15)).toBe(false);
    expect(isAlignedStart(9 * 60 + 1)).toBe(false);
  });

  it("files a time under the interval it starts inside", () => {
    expect(intervalStart(9 * 60)).toBe(540);
    expect(intervalStart(9 * 60 + 15)).toBe(540);
    expect(intervalStart(9 * 60 + 29)).toBe(540);
    expect(intervalStart(9 * 60 + 30)).toBe(570);
  });
});

describe("isAlignedStartTime", () => {
  it("accepts the hour and the half hour", () => {
    expect(isAlignedStartTime("09:00")).toBe(true);
    expect(isAlignedStartTime("09:30")).toBe(true);
    expect(isAlignedStartTime("00:00")).toBe(true);
    expect(isAlignedStartTime("23:30")).toBe(true);
  });

  it("rejects the quarter hours", () => {
    expect(isAlignedStartTime("09:15")).toBe(false);
    expect(isAlignedStartTime("09:45")).toBe(false);
  });

  it("rejects any other minute", () => {
    expect(isAlignedStartTime("09:01")).toBe(false);
    expect(isAlignedStartTime("09:29")).toBe(false);
  });

  it("rejects anything that is not a wall-clock time", () => {
    expect(isAlignedStartTime("9:00")).toBe(false);
    expect(isAlignedStartTime("24:00")).toBe(false);
    expect(isAlignedStartTime("")).toBe(false);
  });

  it("agrees with the shared interval rather than a hardcoded 30", () => {
    for (let minutes = 0; minutes < 24 * 60; minutes += 1) {
      expect(isAlignedStartTime(formatSlotTime(minutes))).toBe(
        minutes % SCHEDULING_INTERVAL_MINUTES === 0
      );
    }
  });
});

describe("isStartTimeChangeAllowed", () => {
  it("accepts an aligned time for a class that was already aligned", () => {
    expect(isStartTimeChangeAllowed("09:00", "10:30")).toBe(true);
  });

  it("rejects a new time that is not aligned", () => {
    expect(isStartTimeChangeAllowed("09:00", "10:15")).toBe(false);
    expect(isStartTimeChangeAllowed("09:00", "10:45")).toBe(false);
  });

  it("keeps a legacy time that is being left alone", () => {
    // Changing only the teacher, the date or the duration submits the same start
    // time, and a class stored at 08:15 must not be blocked or rounded.
    expect(isStartTimeChangeAllowed("08:15", "08:15")).toBe(true);
  });

  it("rejects moving a legacy time to another unaligned time", () => {
    expect(isStartTimeChangeAllowed("08:15", "08:45")).toBe(false);
  });

  it("lets a legacy time be corrected onto the interval", () => {
    expect(isStartTimeChangeAllowed("08:15", "08:30")).toBe(true);
  });

  it("never rewrites anything: it only answers yes or no", () => {
    const current = "08:15";
    isStartTimeChangeAllowed(current, "09:00");

    expect(current).toBe("08:15");
  });
});

describe("parseWallClockMinutes", () => {
  it("reads a wall-clock time as minutes since midnight", () => {
    expect(parseWallClockMinutes("00:00")).toBe(0);
    expect(parseWallClockMinutes("09:30")).toBe(570);
    expect(parseWallClockMinutes("23:45")).toBe(1425);
  });

  it("rejects anything that is not one", () => {
    expect(parseWallClockMinutes("24:00")).toBeNull();
    expect(parseWallClockMinutes("9:30")).toBeNull();
    expect(parseWallClockMinutes("09:60")).toBeNull();
    expect(parseWallClockMinutes("")).toBeNull();
  });
});

describe("startTimeOptions", () => {
  it("offers every half hour of the day and nothing else", () => {
    const options = startTimeOptions();

    expect(options).toHaveLength((24 * 60) / SCHEDULING_INTERVAL_MINUTES);
    expect(options[0]).toEqual({ value: "00:00", label: "00:00" });
    expect(options[1]).toEqual({ value: "00:30", label: "00:30" });
    expect(options.at(-1)).toEqual({ value: "23:30", label: "23:30" });
    expect(options.every((option) => isAlignedStart(parseWallClockMinutes(option.value) ?? 1)))
      .toBe(true);
  });

  it("adds nothing when the current time is already on the half hour", () => {
    expect(startTimeOptions("09:30")).toEqual(startTimeOptions());
  });

  it("keeps a stored time that is not on the half hour selectable", () => {
    const options = startTimeOptions("08:15");
    const preserved = options.find((option) => option.value === "08:15");

    expect(preserved).toEqual({ value: "08:15", label: "08:15 (current)" });
  });

  it("places the preserved time in order, between the half hours around it", () => {
    const values = startTimeOptions("08:15").map((option) => option.value);

    expect(values.slice(values.indexOf("08:00"), values.indexOf("08:30") + 1)).toEqual([
      "08:00",
      "08:15",
      "08:30",
    ]);
  });

  it("preserves a legacy time later than the last half hour of the day", () => {
    const values = startTimeOptions("23:45").map((option) => option.value);

    expect(values.at(-1)).toBe("23:45");
  });

  it("never drops a half hour to make room for the preserved one", () => {
    expect(startTimeOptions("08:15")).toHaveLength(
      startTimeOptions().length + 1
    );
  });
});

describe("offsetFromMinutes", () => {
  it("places a start time proportionally inside the grid", () => {
    expect(offsetFromMinutes(9 * 60, 8 * 60, 80)).toBe(80);
    expect(offsetFromMinutes(8 * 60 + 30, 8 * 60, 80)).toBe(40);
  });

  it("places a legacy time that is not on the half hour at its real position", () => {
    expect(offsetFromMinutes(8 * 60 + 15, 8 * 60, 80)).toBe(20);
  });
});

describe("slotStarts", () => {
  it("offers every half hour the class still fits inside", () => {
    // 09:00 is excluded: a 30-minute class starting there would run past the
    // last visible hour.
    expect(slotStarts(8, 9, 30)).toEqual([480, 510]);
  });

  it("never offers a quarter hour", () => {
    const starts = slotStarts(8, 12, 60);

    expect(starts).toEqual([480, 510, 540, 570, 600, 630, 660]);
    expect(starts.every(isAlignedStart)).toBe(true);
  });

  it("stops early enough that the class still fits before the last hour", () => {
    expect(slotStarts(8, 9, 60)).toEqual([480]);
  });

  it("offers nothing when the class is longer than the visible range", () => {
    expect(slotStarts(8, 9, 120)).toEqual([]);
  });

  it("still offers destinations for a class whose length is not a whole interval", () => {
    // A 45-minute session generated by an older slot must remain movable, and it
    // moves to the same half hours as everything else. 09:30 is the last one that
    // still ends by 10:00.
    expect(slotStarts(8, 10, 45)).toEqual([480, 510, 540]);
  });
});

describe("buildAgendaRows", () => {
  const session = (id: string, startMinutes: number) => ({ id, startMinutes });

  it("puts a row where a class is and a row where an action is offered", () => {
    const rows = buildAgendaRows([session("a", 540)], [510, 540]);

    expect(rows.map((row) => row.startMinutes)).toEqual([510, 540]);
    expect(rows[0]?.sessions).toEqual([]);
    expect(rows[0]?.isActionable).toBe(true);
    expect(rows[1]?.sessions).toEqual([session("a", 540)]);
    expect(rows[1]?.isActionable).toBe(true);
  });

  it("keeps a class that does not start on the half hour in the row it falls inside", () => {
    const rows = buildAgendaRows([session("legacy", 495)], [480, 510]);

    expect(rows.find((row) => row.startMinutes === 480)?.sessions).toEqual([
      session("legacy", 495),
    ]);
    expect(rows.find((row) => row.startMinutes === 510)?.sessions).toEqual([]);
  });

  it("keeps a class visible even where no destination is offered", () => {
    // A long class being moved leaves no destination late in the day; the classes
    // already there must not disappear from the agenda with it.
    const rows = buildAgendaRows([session("late", 1140)], [480, 510]);

    expect(rows.map((row) => row.startMinutes)).toEqual([480, 510, 1140]);
    expect(rows.at(-1)?.isActionable).toBe(false);
  });

  it("shows only the classes themselves when no action is offered", () => {
    const rows = buildAgendaRows([session("a", 600), session("b", 540)], []);

    expect(rows.map((row) => row.startMinutes)).toEqual([540, 600]);
    expect(rows.every((row) => !row.isActionable)).toBe(true);
  });

  it("orders classes sharing a row by when they start", () => {
    const rows = buildAgendaRows([session("later", 555), session("earlier", 540)], []);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.sessions.map((s) => s.id)).toEqual(["earlier", "later"]);
  });

  it("has no rows for a day with no classes and no move in progress", () => {
    expect(buildAgendaRows([], [])).toEqual([]);
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

describe("availability while the calendar is filtered to one teacher", () => {
  // The class being moved belongs to teacher A. The calendar is filtered to
  // teacher B, so none of A's classes are among the cards on screen — but A's own
  // booked time is loaded separately, and that is what a destination is judged
  // against.
  const teacherABusy = [
    { date: "2026-08-17", startMinutes: 600, durationMinutes: 60 },
    { date: "2026-08-18", startMinutes: 540, durationMinutes: 60 },
  ];

  it("still finds the conflict when the teacher's class is not on screen", () => {
    const occupied = occupiedOnDate(teacherABusy, "2026-08-17");

    expect(
      classifyDestination({ startMinutes: 600, durationMinutes: 60 }, occupied, null)
    ).toBe("conflict");
  });

  it("only counts the day being classified", () => {
    expect(occupiedOnDate(teacherABusy, "2026-08-17")).toEqual([
      { startMinutes: 600, durationMinutes: 60 },
    ]);
    expect(occupiedOnDate(teacherABusy, "2026-08-19")).toEqual([]);
  });

  it("leaves a day the teacher has nothing on fully available", () => {
    const occupied = occupiedOnDate(teacherABusy, "2026-08-19");

    expect(
      slotStarts(8, 12, 60).map((startMinutes) =>
        classifyDestination({ startMinutes, durationMinutes: 60 }, occupied, null)
      )
    ).toEqual(Array(7).fill("free"));
  });

  it("carries no detail about the classes that make the teacher busy", () => {
    expect(Object.keys(occupiedOnDate(teacherABusy, "2026-08-17")[0] ?? {}).sort()).toEqual([
      "durationMinutes",
      "startMinutes",
    ]);
  });

  it("allows a destination back-to-back with the teacher's other class", () => {
    const occupied = occupiedOnDate(teacherABusy, "2026-08-17");

    expect(
      classifyDestination({ startMinutes: 660, durationMinutes: 60 }, occupied, null)
    ).toBe("free");
    expect(
      classifyDestination({ startMinutes: 540, durationMinutes: 60 }, occupied, null)
    ).toBe("free");
  });

  it("classifies a legacy start time that is not on the half hour like any other", () => {
    // The teacher's 10:15 class still blocks the 10:00 and 10:30 destinations.
    const occupied = occupiedOnDate(
      [{ date: "2026-08-17", startMinutes: 615, durationMinutes: 45 }],
      "2026-08-17"
    );

    expect(
      classifyDestination({ startMinutes: 600, durationMinutes: 30 }, occupied, null)
    ).toBe("conflict");
    expect(
      classifyDestination({ startMinutes: 630, durationMinutes: 30 }, occupied, null)
    ).toBe("conflict");
    expect(
      classifyDestination({ startMinutes: 660, durationMinutes: 30 }, occupied, null)
    ).toBe("free");
  });
});

describe("calendar mode", () => {
  it("browses when nothing is being moved and moves when something is", () => {
    expect(calendarMode(null)).toBe("browse");
    expect(calendarMode(undefined)).toBe("browse");
    expect(calendarMode("session-1")).toBe("moving");
  });

  it("offers creation only while browsing", () => {
    expect(offersCreation(calendarMode(null))).toBe(true);
    expect(offersCreation(calendarMode("session-1"))).toBe(false);
  });

  it("offers move destinations only while moving", () => {
    expect(offersMoveDestinations(calendarMode(null))).toBe(false);
    expect(offersMoveDestinations(calendarMode("session-1"))).toBe(true);
  });

  it("never offers both at once, so a position always means one thing", () => {
    for (const movingId of [null, undefined, "session-1"]) {
      const mode = calendarMode(movingId);

      expect(offersCreation(mode) && offersMoveDestinations(mode)).toBe(false);
    }
  });
});

describe("moveGridFocus", () => {
  // Two days of half hours, which is enough to see every edge.
  const starts = [480, 510, 540, 570];
  const dayCount = 6;
  const at = (dayIndex: number, startMinutes: number) => ({ dayIndex, startMinutes });

  it("moves one position down and up", () => {
    expect(moveGridFocus(at(0, 510), "ArrowDown", dayCount, starts)).toEqual(at(0, 540));
    expect(moveGridFocus(at(0, 510), "ArrowUp", dayCount, starts)).toEqual(at(0, 480));
  });

  it("stops at the first and last position instead of wrapping", () => {
    expect(moveGridFocus(at(0, 480), "ArrowUp", dayCount, starts)).toEqual(at(0, 480));
    expect(moveGridFocus(at(0, 570), "ArrowDown", dayCount, starts)).toEqual(at(0, 570));
  });

  it("changes day and keeps the time", () => {
    expect(moveGridFocus(at(2, 540), "ArrowRight", dayCount, starts)).toEqual(at(3, 540));
    expect(moveGridFocus(at(2, 540), "ArrowLeft", dayCount, starts)).toEqual(at(1, 540));
  });

  it("stops at the first and last day", () => {
    expect(moveGridFocus(at(0, 540), "ArrowLeft", dayCount, starts)).toEqual(at(0, 540));
    expect(moveGridFocus(at(5, 540), "ArrowRight", dayCount, starts)).toEqual(at(5, 540));
  });

  it("jumps to the first and last position of the day, staying on that day", () => {
    expect(moveGridFocus(at(3, 540), "Home", dayCount, starts)).toEqual(at(3, 480));
    expect(moveGridFocus(at(3, 510), "End", dayCount, starts)).toEqual(at(3, 570));
  });

  it("ignores keys it does not handle, so they keep their normal behaviour", () => {
    expect(moveGridFocus(at(0, 540), "Enter", dayCount, starts)).toBeNull();
    expect(moveGridFocus(at(0, 540), " ", dayCount, starts)).toBeNull();
    expect(moveGridFocus(at(0, 540), "Escape", dayCount, starts)).toBeNull();
    expect(moveGridFocus(at(0, 540), "Tab", dayCount, starts)).toBeNull();
  });

  it("ignores a position that is not in the grid", () => {
    expect(moveGridFocus(at(0, 495), "ArrowDown", dayCount, starts)).toBeNull();
    expect(moveGridFocus(at(-1, 540), "ArrowDown", dayCount, starts)).toBeNull();
    expect(moveGridFocus(at(6, 540), "ArrowDown", dayCount, starts)).toBeNull();
  });

  it("walks a full week of creation positions without leaving the grid", () => {
    const weekStarts = creationStarts(8, 20);
    let focus = { dayIndex: 0, startMinutes: weekStarts[0] ?? 0 };

    for (let step = 0; step < 500; step += 1) {
      focus = moveGridFocus(focus, "ArrowDown", dayCount, weekStarts) ?? focus;
      focus = moveGridFocus(focus, "ArrowRight", dayCount, weekStarts) ?? focus;
    }

    expect(focus.dayIndex).toBe(dayCount - 1);
    expect(focus.startMinutes).toBe(weekStarts.at(-1));
  });
});

describe("creationStarts", () => {
  it("offers every half hour of the visible grid", () => {
    expect(creationStarts(8, 10)).toEqual([480, 510, 540, 570]);
  });

  it("only offers aligned positions", () => {
    expect(creationStarts(8, 20).every(isAlignedStart)).toBe(true);
  });

  it("does not consult the sessions on screen at all", () => {
    // Two teachers may teach at once, so a position another teacher's class is
    // drawn over is still offered. Availability is the server's question.
    expect(creationStarts(9, 10)).toEqual([540, 570]);
  });
});

describe("creationInputFor", () => {
  const dayLabel = "Mon 17";

  it("turns a desktop grid position into the date and start time the server takes", () => {
    expect(creationInputFor({ date: "2026-08-17", startMinutes: 570, dayLabel })).toEqual({
      date: "2026-08-17",
      startTime: "09:30",
    });
  });

  it("turns a mobile agenda row into exactly the same input", () => {
    const fromGrid = creationInputFor({ date: "2026-08-17", startMinutes: 570, dayLabel });
    const fromAgenda = creationInputFor({
      date: "2026-08-17",
      startMinutes: 570,
      dayLabel: "Monday 17",
    });

    expect(fromAgenda).toEqual(fromGrid);
  });

  it("maps the first and last positions of a day correctly", () => {
    expect(creationInputFor({ date: "2026-08-17", startMinutes: 0, dayLabel }).startTime).toBe(
      "00:00"
    );
    expect(
      creationInputFor({ date: "2026-08-17", startMinutes: 1410, dayLabel }).startTime
    ).toBe("23:30");
  });

  it("sends nothing but the date and the time", () => {
    expect(
      Object.keys(creationInputFor({ date: "2026-08-17", startMinutes: 540, dayLabel })).sort()
    ).toEqual(["date", "startTime"]);
  });

  it("produces a start time every calendar position agrees on", () => {
    const positions = creationStarts(8, 12);

    expect(
      positions.map(
        (startMinutes) => creationInputFor({ date: "2026-08-17", startMinutes, dayLabel }).startTime
      )
    ).toEqual(["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]);
  });
});

describe("isPositionCovered", () => {
  // A layout question only: it decides where the "Add class" wording fits, never
  // whether a class may be created there.
  const nineToTen = [{ startMinutes: 540, durationMinutes: 60 }];

  it("reports a position a card is drawn across", () => {
    expect(isPositionCovered(540, nineToTen)).toBe(true);
    expect(isPositionCovered(570, nineToTen)).toBe(true);
  });

  it("leaves the positions either side of a class uncovered", () => {
    expect(isPositionCovered(510, nineToTen)).toBe(false);
    expect(isPositionCovered(600, nineToTen)).toBe(false);
  });

  it("reports nothing covered on an empty day", () => {
    expect(isPositionCovered(540, [])).toBe(false);
  });

  it("still lets that position be offered for creation", () => {
    // The two answers are independent on purpose: another teacher's class covers
    // the pixels, not the time.
    expect(creationStarts(9, 10)).toContain(540);
    expect(isPositionCovered(540, nineToTen)).toBe(true);
  });
});

describe("endTimeLabel", () => {
  it("adds the duration to the start", () => {
    expect(endTimeLabel(540, 60)).toBe("10:00");
    expect(endTimeLabel(570, 45)).toBe("10:15");
  });

  it("wraps at midnight rather than reading past 24:00", () => {
    expect(endTimeLabel(1410, 60)).toBe("00:30");
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

/**
 * Where the phone agenda opens. It scrolls inside its own panel, so opening at the
 * top of a twelve-hour list would hide whatever the reader came for.
 */
describe("initialAgendaScrollMinutes", () => {
  const hours = { startHour: 8, endHour: 20 };

  it("opens today at the half hour happening now", () => {
    expect(
      initialAgendaScrollMinutes({
        isToday: true,
        nowMinutes: 9 * 60 + 47,
        firstSessionMinutes: 8 * 60,
        ...hours,
      })
    ).toBe(9 * 60 + 30);
  });

  it("prefers now over the first class, because today is about now", () => {
    expect(
      initialAgendaScrollMinutes({
        isToday: true,
        nowMinutes: 15 * 60,
        firstSessionMinutes: 8 * 60,
        ...hours,
      })
    ).toBe(15 * 60);
  });

  it("falls back to the first class when now is outside operating hours", () => {
    expect(
      initialAgendaScrollMinutes({
        isToday: true,
        nowMinutes: 6 * 60,
        firstSessionMinutes: 11 * 60,
        ...hours,
      })
    ).toBe(11 * 60);

    expect(
      initialAgendaScrollMinutes({
        isToday: true,
        nowMinutes: 22 * 60,
        firstSessionMinutes: 11 * 60,
        ...hours,
      })
    ).toBe(11 * 60);
  });

  it("opens another day at its first class", () => {
    expect(
      initialAgendaScrollMinutes({
        isToday: false,
        nowMinutes: 9 * 60,
        firstSessionMinutes: 13 * 60,
        ...hours,
      })
    ).toBe(13 * 60);
  });

  it("opens an empty day at the start, which is what null asks for", () => {
    expect(
      initialAgendaScrollMinutes({
        isToday: false,
        nowMinutes: 9 * 60,
        firstSessionMinutes: null,
        ...hours,
      })
    ).toBeNull();
  });

  it("opens at the start when today is empty and now is out of hours", () => {
    expect(
      initialAgendaScrollMinutes({
        isToday: true,
        nowMinutes: 5 * 60,
        firstSessionMinutes: null,
        ...hours,
      })
    ).toBeNull();
  });

  it("treats the last visible hour as past the end", () => {
    // 20:00 is the grid's exclusive end, so there is no row to open at.
    expect(
      initialAgendaScrollMinutes({
        isToday: true,
        nowMinutes: 20 * 60,
        firstSessionMinutes: null,
        ...hours,
      })
    ).toBeNull();
  });

  it("ignores an unknown clock rather than guessing", () => {
    expect(
      initialAgendaScrollMinutes({
        isToday: true,
        nowMinutes: null,
        firstSessionMinutes: 9 * 60,
        ...hours,
      })
    ).toBe(9 * 60);
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

/**
 * Move mode is a fact about the URL rather than component state, so the whole of
 * its lifecycle is visible here.
 *
 * Both ways out — a move that succeeded and a move that was cancelled — go to the
 * same address: the week and teacher filter that were on screen, without `moving`.
 * Both are performed with `router.replace`, because `?moving=` is temporary state
 * rather than somewhere the reader navigated to; pushing would leave the abandoned
 * move in history for Back to walk into. A move the server refused changes no URL
 * at all, so move mode simply stays open.
 */
describe("leaving move mode", () => {
  const week = "2026-08-17";
  const teacher = "t1";
  const moving = "session-1";

  it("keeps move mode when the server refuses the move", () => {
    // Nothing navigates on a refusal, so the address is still the move-mode one and
    // another destination can be chosen straight away.
    const url = calendarUrl({ week, teacher, moving });

    expect(url).toContain("moving=session-1");
    expect(calendarMode(moving)).toBe("moving");
  });

  it("returns a successful move to the same week and teacher, without moving", () => {
    const cleanup = calendarUrl({ week, teacher });

    expect(cleanup).toBe("/calendar?week=2026-08-17&teacher=t1");
    expect(cleanup).not.toContain("moving");
    expect(calendarMode(null)).toBe("browse");
  });

  it("differs from the move-mode address only by dropping moving", () => {
    // Both exits build this same address, so neither can quietly lose the week or
    // the teacher filter the reader was working under.
    const inMove = calendarUrl({ week, teacher, moving });
    const cleanup = calendarUrl({ week, teacher });

    expect(inMove).toBe(`${cleanup}&moving=${moving}`);
  });

  it("keeps an unfiltered calendar unfiltered on the way out", () => {
    expect(calendarUrl({ week })).toBe("/calendar?week=2026-08-17");
  });

  it("still carries move mode across a genuine week change", () => {
    // Changing week is real navigation and keeps its history entry; the move is
    // carried along rather than dropped.
    const nextWeek = calendarUrl({ week: "2026-08-24", teacher, moving });

    expect(nextWeek).toBe("/calendar?week=2026-08-24&teacher=t1&moving=session-1");
    expect(calendarMode(moving)).toBe("moving");
  });

  it("returns positions to offering creation once move mode is left", () => {
    expect(offersCreation(calendarMode(moving))).toBe(false);
    expect(offersCreation(calendarMode(null))).toBe(true);
  });
});
