import { describe, expect, it } from "vitest";
import { placeDaySessions, visibleHourRange, type Placeable } from "./layout";

/** A class starting at `startMinutes`, `durationMinutes` long. */
function at(id: string, startMinutes: number, durationMinutes = 60): Placeable {
  return { id, startMinutes, durationMinutes };
}

const DAY_START = 8 * 60;
const HOUR = 60;

function placementOf(placed: ReturnType<typeof placeDaySessions>, id: string) {
  const found = placed.find((item) => item.id === id);
  if (!found) throw new Error(`${id} was not placed`);
  return found;
}

describe("placeDaySessions", () => {
  it("gives a lone class the full width", () => {
    const placed = placeDaySessions([at("a", 9 * 60)], DAY_START, HOUR);

    expect(placed).toHaveLength(1);
    expect(placed[0]).toMatchObject({ leftPercent: 0, widthPercent: 100 });
  });

  it("positions a class by its distance from the start of the day", () => {
    const placed = placeDaySessions([at("a", 10 * 60, 90)], DAY_START, HOUR);

    expect(placementOf(placed, "a").top).toBe(2 * HOUR);
    expect(placementOf(placed, "a").height).toBe(1.5 * HOUR);
  });

  it("splits two classes that genuinely overlap", () => {
    const placed = placeDaySessions([at("a", 9 * 60), at("b", 9 * 60)], DAY_START, HOUR);

    expect(placementOf(placed, "a")).toMatchObject({ leftPercent: 0, widthPercent: 50 });
    expect(placementOf(placed, "b")).toMatchObject({ leftPercent: 50, widthPercent: 50 });
  });

  it("keeps back-to-back classes full width — touching is not overlapping", () => {
    const placed = placeDaySessions([at("a", 9 * 60), at("b", 10 * 60)], DAY_START, HOUR);

    expect(placementOf(placed, "a").widthPercent).toBe(100);
    expect(placementOf(placed, "b").widthPercent).toBe(100);
  });

  it("widens a class into the space a shorter overlap leaves free", () => {
    // A long class 09:00–12:00 with a single one-hour class beside it at 09:00.
    // The long one must not stay at half width for its whole length, and the
    // free second column below 10:00 belongs to nobody.
    const placed = placeDaySessions(
      [at("long", 9 * 60, 180), at("short", 9 * 60, 60), at("later", 10 * 60, 60)],
      DAY_START,
      HOUR
    );

    // "later" starts once "short" has ended, so it takes the same column and
    // then widens, because nothing sits to its right at that time.
    expect(placementOf(placed, "short").widthPercent).toBe(50);
    expect(placementOf(placed, "later").widthPercent).toBe(50);
    expect(placementOf(placed, "long").widthPercent).toBe(50);
  });

  it("lets a class in a three-way cluster widen when its neighbour has ended", () => {
    // 09:00 a, 09:00 b, 09:00 c all overlap → three columns. Then at 10:30 a
    // fourth class in the same cluster has columns 2 and 3 free beside it.
    const placed = placeDaySessions(
      [at("a", 9 * 60, 120), at("b", 9 * 60, 60), at("c", 9 * 60, 60), at("d", 10 * 60, 60)],
      DAY_START,
      HOUR
    );

    // `d` starts after `b` ends, takes b's column, and spreads over c's too.
    expect(placementOf(placed, "d").widthPercent).toBeGreaterThan(100 / 3);
    // The genuinely simultaneous three still share the width evenly.
    expect(placementOf(placed, "a").widthPercent).toBeCloseTo(100 / 3);
  });

  it("never lets two overlapping classes cover the same horizontal space", () => {
    const placed = placeDaySessions(
      [at("a", 9 * 60, 120), at("b", 9 * 60, 60), at("c", 9 * 60, 60)],
      DAY_START,
      HOUR
    );

    const spans = placed.map((item) => [item.leftPercent, item.leftPercent + item.widthPercent]);
    for (let i = 0; i < spans.length; i += 1) {
      for (let j = i + 1; j < spans.length; j += 1) {
        const [aStart, aEnd] = spans[i]!;
        const [bStart, bEnd] = spans[j]!;
        expect(aStart! < bEnd! && bStart! < aEnd!).toBe(false);
      }
    }
  });

  it("gives a very short class a floor height so it stays clickable", () => {
    const placed = placeDaySessions([at("a", 9 * 60, 5)], DAY_START, HOUR);

    expect(placementOf(placed, "a").height).toBeGreaterThanOrEqual(26);
  });

  it("places nothing for an empty day", () => {
    expect(placeDaySessions([], DAY_START, HOUR)).toEqual([]);
  });
});

describe("visibleHourRange", () => {
  it("covers the default teaching day when everything fits inside it", () => {
    expect(visibleHourRange([at("a", 10 * 60)])).toEqual({ startHour: 7, endHour: 22 });
  });

  it("keeps an early-morning slot bookable by default", () => {
    // 07:00 is inside the default range, so a creation position exists there
    // even on a week that has no early class yet.
    expect(visibleHourRange([]).startHour).toBeLessThanOrEqual(7);
  });

  it("keeps a late-evening slot bookable by default", () => {
    // Students in other time zones make a 21:00 class ordinary.
    expect(visibleHourRange([]).endHour).toBeGreaterThanOrEqual(22);
  });

  it("widens further for a class before the default start", () => {
    expect(visibleHourRange([at("a", 6 * 60)]).startHour).toBe(6);
  });

  it("widens further for a class running past the default end", () => {
    expect(visibleHourRange([at("a", 22 * 60, 60)]).endHour).toBe(23);
  });

  it("accepts explicit bounds, for a future Settings screen", () => {
    expect(visibleHourRange([], 9, 18)).toEqual({ startHour: 9, endHour: 18 });
  });
});
