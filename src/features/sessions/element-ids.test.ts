import { describe, expect, it } from "vitest";
import {
  agendaRowId,
  createPositionId,
  moveDestinationId,
  sessionCardId,
  type CalendarView,
} from "./element-ids";

const VIEWS: CalendarView[] = ["grid", "agenda"];

describe("createPositionId", () => {
  it("is stable for the same view, date and time", () => {
    expect(createPositionId("grid", "2026-08-17", 540)).toBe(
      createPositionId("grid", "2026-08-17", 540)
    );
  });

  it("differs between the two responsive views", () => {
    expect(createPositionId("grid", "2026-08-17", 540)).not.toBe(
      createPositionId("agenda", "2026-08-17", 540)
    );
  });

  it("differs by date and by time", () => {
    expect(createPositionId("grid", "2026-08-17", 540)).not.toBe(
      createPositionId("grid", "2026-08-18", 540)
    );
    expect(createPositionId("grid", "2026-08-17", 540)).not.toBe(
      createPositionId("grid", "2026-08-17", 570)
    );
  });
});

describe("moveDestinationId", () => {
  it("differs between the two responsive views", () => {
    expect(moveDestinationId("grid", "2026-08-17", 540)).not.toBe(
      moveDestinationId("agenda", "2026-08-17", 540)
    );
  });

  it("never collides with a creation position at the same place", () => {
    for (const view of VIEWS) {
      expect(moveDestinationId(view, "2026-08-17", 540)).not.toBe(
        createPositionId(view, "2026-08-17", 540)
      );
    }
  });
});

describe("sessionCardId", () => {
  it("differs between the two responsive views", () => {
    expect(sessionCardId("grid", "abc")).not.toBe(sessionCardId("agenda", "abc"));
  });
});

describe("agendaRowId", () => {
  it("is stable for a day and time, and unique across days and times", () => {
    expect(agendaRowId("2026-08-17", 540)).toBe(agendaRowId("2026-08-17", 540));
    expect(agendaRowId("2026-08-17", 540)).not.toBe(agendaRowId("2026-08-18", 540));
    expect(agendaRowId("2026-08-17", 540)).not.toBe(agendaRowId("2026-08-17", 570));
  });

  it("never collides with the controls drawn inside it", () => {
    expect(agendaRowId("2026-08-17", 540)).not.toBe(
      createPositionId("agenda", "2026-08-17", 540)
    );
    expect(agendaRowId("2026-08-17", 540)).not.toBe(
      moveDestinationId("agenda", "2026-08-17", 540)
    );
  });
});

/**
 * The point of the whole module: both views are mounted at once, so any id that
 * appeared in both would make `getElementById` able to return the copy inside the
 * hidden tree — an element that cannot take focus.
 */
describe("ids across both mounted views", () => {
  it("produces no duplicates for the same week of positions", () => {
    const dates = ["2026-08-17", "2026-08-18", "2026-08-19"];
    const starts = [480, 510, 540, 570];
    const ids: string[] = [];

    for (const view of VIEWS) {
      for (const date of dates) {
        for (const startMinutes of starts) {
          ids.push(createPositionId(view, date, startMinutes));
          ids.push(moveDestinationId(view, date, startMinutes));
        }
      }
    }

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces no duplicates for the same sessions", () => {
    const sessionIds = ["s1", "s2", "s3"];
    const ids = VIEWS.flatMap((view) => sessionIds.map((id) => sessionCardId(view, id)));

    expect(new Set(ids).size).toBe(ids.length);
  });
});
