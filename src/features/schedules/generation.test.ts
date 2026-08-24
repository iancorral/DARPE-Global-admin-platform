import { describe, expect, it } from "vitest";
import {
  expandSlotsForDates,
  occurrenceClassType,
  slotAudience,
  type GeneratableSlot,
} from "./generation";

function slot(overrides: Partial<GeneratableSlot> = {}): GeneratableSlot {
  return {
    id: "slot1",
    weekday: 1,
    startTime: "09:00",
    durationMinutes: 60,
    startsOn: new Date("2026-08-01T00:00:00Z"),
    endsOn: null,
    teacherId: "t1",
    languageId: "en",
    studentIds: ["s1"],
    groupId: null,
    ...overrides,
  };
}

describe("slotAudience", () => {
  it("resolves an individual pattern to its one student", () => {
    expect(
      slotAudience({ student: { id: "s1", languageId: "en" }, group: null })
    ).toEqual({ languageId: "en", studentIds: ["s1"], groupId: null });
  });

  it("resolves a group pattern to every member", () => {
    expect(
      slotAudience({
        student: null,
        group: {
          id: "g1",
          languageId: "fr",
          members: [{ studentId: "s1" }, { studentId: "s2" }, { studentId: "s3" }],
        },
      })
    ).toEqual({ languageId: "fr", studentIds: ["s1", "s2", "s3"], groupId: "g1" });
  });

  it("takes the language from whichever side is set", () => {
    // The group's language wins for a group pattern, never a member's own.
    const audience = slotAudience({
      student: null,
      group: { id: "g1", languageId: "ja", members: [{ studentId: "s1" }] },
    });

    expect(audience?.languageId).toBe("ja");
  });

  it("skips a group with no members — a class with nobody is not a class", () => {
    expect(
      slotAudience({ student: null, group: { id: "g1", languageId: "fr", members: [] } })
    ).toBeNull();
  });

  it("skips a pattern with no audience at all", () => {
    expect(slotAudience({ student: null, group: null })).toBeNull();
  });
});

describe("expandSlotsForDates", () => {
  // 2026-08-03 is a Monday, 2026-08-10 the next.
  const mondays = ["2026-08-03", "2026-08-10"];

  it("produces one occurrence per matching weekday", () => {
    expect(expandSlotsForDates([slot()], mondays)).toHaveLength(2);
  });

  it("carries every group member onto the occurrence", () => {
    const [occurrence] = expandSlotsForDates(
      [slot({ studentIds: ["s1", "s2", "s3"], groupId: "g1" })],
      ["2026-08-03"]
    );

    expect(occurrence?.studentIds).toEqual(["s1", "s2", "s3"]);
    expect(occurrence?.groupId).toBe("g1");
  });

  it("ignores dates before the pattern starts", () => {
    const occurrences = expandSlotsForDates(
      [slot({ startsOn: new Date("2026-08-05T00:00:00Z") })],
      mondays
    );

    expect(occurrences.map((o) => o.occurrenceOn)).toEqual(["2026-08-10"]);
  });

  it("ignores dates after the pattern ends", () => {
    const occurrences = expandSlotsForDates(
      [slot({ endsOn: new Date("2026-08-05T00:00:00Z") })],
      mondays
    );

    expect(occurrences.map((o) => o.occurrenceOn)).toEqual(["2026-08-03"]);
  });

  it("ignores a different weekday", () => {
    expect(expandSlotsForDates([slot({ weekday: 3 })], mondays)).toEqual([]);
  });
});

describe("occurrenceClassType", () => {
  it("calls a pattern with a group a group class", () => {
    expect(occurrenceClassType({ groupId: "g1" })).toBe("GROUP");
  });

  it("calls a pattern without one individual", () => {
    expect(occurrenceClassType({ groupId: null })).toBe("INDIVIDUAL");
  });
});
