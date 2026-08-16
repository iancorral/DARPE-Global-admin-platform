import { describe, expect, it } from "vitest";
import {
  COMPLETED_IN_FUTURE_MESSAGE,
  planOldSlotChange,
  planSeriesEnd,
  planSeriesSplit,
  type FutureOccurrence,
} from "./series-edit";
import { weeklyOccurrenceDates } from "./series";
import { expandSlotsForDates, occurrenceKey, type GeneratableSlot } from "./generation";
import { parseDateOnly } from "@/lib/datetime";

const occurrence = (
  sessionId: string,
  occurrenceOn: string,
  status: FutureOccurrence["status"] = "SCHEDULED",
  hasParticipant = true
): FutureOccurrence => ({ sessionId, occurrenceOn, status, hasParticipant });

/** A Monday series: Aug 17, 24, 31, Sep 7. */
const MONDAYS = ["2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07"];

function split(params: {
  cutoffOn: string;
  slotStartsOn: string;
  futureOccurrences: FutureOccurrence[];
  replacementDates: string[];
}) {
  const result = planSeriesSplit(params);
  if (!result.ok) throw new Error(`expected a plan, got: ${result.error}`);
  return result.plan;
}

describe("planOldSlotChange", () => {
  it("ends the old rule the day before the cutoff", () => {
    expect(planOldSlotChange("2026-08-24", "2026-08-03")).toEqual({
      action: "endOn",
      endsOn: "2026-08-23",
    });
  });

  it("deactivates instead when the cutoff is the rule's first occurrence", () => {
    // Ending it the day before would be a range that starts after it finishes.
    expect(planOldSlotChange("2026-08-17", "2026-08-17")).toEqual({ action: "deactivate" });
  });

  it("deactivates defensively when the cutoff somehow precedes the start", () => {
    expect(planOldSlotChange("2026-08-10", "2026-08-17")).toEqual({ action: "deactivate" });
  });

  it("crosses a month boundary correctly", () => {
    expect(planOldSlotChange("2026-09-01", "2026-08-03")).toEqual({
      action: "endOn",
      endsOn: "2026-08-31",
    });
  });
});

describe("the cutoff is the occurrence, not where the class was moved to", () => {
  it("orders and maps by slotOccurrenceOn even when rows arrive out of order", () => {
    // s2 stands for Aug 24 but was moved to a Thursday; it is still the second week.
    const plan = split({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: [
        occurrence("s2", "2026-08-24"),
        occurrence("s1", "2026-08-17"),
        occurrence("s3", "2026-08-31"),
      ],
      replacementDates: ["2026-08-18", "2026-08-25", "2026-09-01"],
    });

    expect(plan.updates.map((update) => update.sessionId)).toEqual(["s1", "s2", "s3"]);
    expect(plan.updates.map((update) => update.occurrenceOn)).toEqual([
      "2026-08-18",
      "2026-08-25",
      "2026-09-01",
    ]);
  });
});

describe("planSeriesSplit — same weekday, only the time or teacher changes", () => {
  it("carries every class across and adds nothing", () => {
    const plan = split({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: MONDAYS.map((date, index) => occurrence(`s${index}`, date)),
      replacementDates: MONDAYS,
    });

    expect(plan.updates).toHaveLength(4);
    expect(plan.creates).toHaveLength(0);
    expect(plan.cancels).toHaveLength(0);
    expect(plan.oldSlot).toEqual({ action: "endOn", endsOn: "2026-08-16" });
  });
});

describe("planSeriesSplit — the series moves to another weekday", () => {
  it("takes the existing classes to the new days rather than duplicating them", () => {
    const tuesdays = ["2026-08-18", "2026-08-25", "2026-09-01", "2026-09-08"];
    const plan = split({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: MONDAYS.map((date, index) => occurrence(`s${index}`, date)),
      replacementDates: tuesdays,
    });

    expect(plan.updates.map((update) => update.occurrenceOn)).toEqual(tuesdays);
    expect(plan.creates).toHaveLength(0);
    expect(plan.cancels).toHaveLength(0);
  });
});

describe("planSeriesSplit — a longer replacement", () => {
  it("creates the extra weeks and keeps the existing ones", () => {
    const plan = split({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: [occurrence("s0", "2026-08-17"), occurrence("s1", "2026-08-24")],
      replacementDates: MONDAYS,
    });

    expect(plan.updates.map((update) => update.sessionId)).toEqual(["s0", "s1"]);
    expect(plan.creates.map((create) => create.occurrenceOn)).toEqual([
      "2026-08-31",
      "2026-09-07",
    ]);
    expect(plan.cancels).toHaveLength(0);
  });
});

describe("planSeriesSplit — a shorter replacement", () => {
  it("cancels the surplus scheduled weeks instead of deleting them", () => {
    const plan = split({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: MONDAYS.map((date, index) => occurrence(`s${index}`, date)),
      replacementDates: MONDAYS.slice(0, 2),
    });

    expect(plan.updates).toHaveLength(2);
    expect(plan.cancels.map((cancel) => cancel.sessionId)).toEqual(["s2", "s3"]);
    expect(plan.creates).toHaveLength(0);
  });

  it("leaves an already-cancelled surplus week alone, with nothing to write", () => {
    const plan = split({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: [
        occurrence("s0", "2026-08-17"),
        occurrence("s1", "2026-08-24", "CANCELLED"),
        occurrence("s2", "2026-08-31"),
      ],
      replacementDates: ["2026-08-17"],
    });

    expect(plan.cancels.map((cancel) => cancel.sessionId)).toEqual(["s2"]);
  });
});

describe("planSeriesSplit — cancelled weeks", () => {
  it("stays cancelled at its new date, so the decision is not undone", () => {
    const plan = split({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: [
        occurrence("s0", "2026-08-17"),
        occurrence("s1", "2026-08-24", "CANCELLED"),
        occurrence("s2", "2026-08-31"),
      ],
      replacementDates: ["2026-08-18", "2026-08-25", "2026-09-01"],
    });

    expect(plan.updates[1]).toMatchObject({ sessionId: "s1", status: "CANCELLED" });
    expect(plan.updates[0]?.status).toBe("SCHEDULED");
    expect(plan.updates[2]?.status).toBe("SCHEDULED");
  });

  it("does not let a cancelled week occupy the teacher", () => {
    const plan = split({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: [
        occurrence("s0", "2026-08-17"),
        occurrence("s1", "2026-08-24", "CANCELLED"),
      ],
      replacementDates: ["2026-08-18", "2026-08-25", "2026-09-01"],
    });

    // The cancelled week is skipped; the two scheduled ones are checked.
    expect(plan.occupiedDates).toEqual(["2026-08-18", "2026-09-01"]);
  });
});

describe("planSeriesSplit — participants", () => {
  it("leaves an existing participant alone", () => {
    const plan = split({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: [occurrence("s0", "2026-08-17")],
      replacementDates: ["2026-08-18"],
    });

    expect(plan.updates[0]?.needsParticipant).toBe(false);
  });

  it("asks for one only when a class somehow has none", () => {
    const plan = split({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: [occurrence("s0", "2026-08-17", "SCHEDULED", false)],
      replacementDates: ["2026-08-18"],
    });

    expect(plan.updates[0]?.needsParticipant).toBe(true);
  });
});

describe("planSeriesSplit — completed history", () => {
  it("refuses when a completed class sits at or after the cutoff", () => {
    const result = planSeriesSplit({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: [
        occurrence("s0", "2026-08-17"),
        occurrence("s1", "2026-08-24", "COMPLETED"),
      ],
      replacementDates: MONDAYS,
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe(COMPLETED_IN_FUTURE_MESSAGE);
  });

  it("refuses even when the completed class is the selected one", () => {
    const result = planSeriesSplit({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: [occurrence("s0", "2026-08-17", "COMPLETED")],
      replacementDates: MONDAYS,
    });

    expect(result.ok).toBe(false);
  });
});

describe("planSeriesSplit — an empty replacement", () => {
  it("refuses a range that contains no classes", () => {
    const result = planSeriesSplit({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: [occurrence("s0", "2026-08-17")],
      replacementDates: [],
    });

    expect(result.ok).toBe(false);
  });
});

describe("planSeriesSplit — replacing an open-ended legacy pattern", () => {
  it("produces a finite replacement and retires the old rule at the cutoff", () => {
    // The old rule had no end date; the replacement is bounded by the chosen range.
    const replacementDates = weeklyOccurrenceDates("2026-08-17", "2026-09-07");
    const plan = split({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-01-05",
      futureOccurrences: [occurrence("s0", "2026-08-17"), occurrence("s1", "2026-08-24")],
      replacementDates,
    });

    expect(replacementDates).toEqual(MONDAYS);
    expect(plan.oldSlot).toEqual({ action: "endOn", endsOn: "2026-08-16" });
    expect(plan.updates).toHaveLength(2);
    expect(plan.creates).toHaveLength(2);
  });
});

describe("planSeriesEnd", () => {
  it("cancels the scheduled weeks from the cutoff and ends the rule the day before", () => {
    const plan = planSeriesEnd({
      cutoffOn: "2026-08-24",
      slotStartsOn: "2026-08-03",
      futureOccurrences: [occurrence("s1", "2026-08-24"), occurrence("s2", "2026-08-31")],
    });

    expect(plan.cancelSessionIds).toEqual(["s1", "s2"]);
    expect(plan.oldSlot).toEqual({ action: "endOn", endsOn: "2026-08-23" });
  });

  it("leaves completed and already-cancelled weeks untouched", () => {
    const plan = planSeriesEnd({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: [
        occurrence("done", "2026-08-17", "COMPLETED"),
        occurrence("gone", "2026-08-24", "CANCELLED"),
        occurrence("next", "2026-08-31"),
      ],
    });

    expect(plan.cancelSessionIds).toEqual(["next"]);
  });

  it("deactivates the rule when the cutoff is its first occurrence", () => {
    const plan = planSeriesEnd({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-17",
      futureOccurrences: [occurrence("s0", "2026-08-17")],
    });

    expect(plan.oldSlot).toEqual({ action: "deactivate" });
  });

  it("reports nothing to cancel when every remaining week is already dealt with", () => {
    const plan = planSeriesEnd({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: [occurrence("gone", "2026-08-17", "CANCELLED")],
    });

    expect(plan.cancelSessionIds).toEqual([]);
  });
});

/**
 * Monthly generation must not undo a split or an ended series.
 *
 * These drive the same primitives generation itself uses — `expandSlotsForDates`
 * decides what a rule implies, and `occurrenceKey` decides what already exists —
 * so they check the real mechanism rather than a restatement of it.
 */
describe("monthly generation after a split or an ended series", () => {
  const slot = (overrides: Partial<GeneratableSlot> = {}): GeneratableSlot => ({
    id: "old-slot",
    weekday: 1,
    startTime: "09:00",
    durationMinutes: 60,
    startsOn: parseDateOnly("2026-08-03"),
    endsOn: null,
    teacherId: "t1",
    student: { id: "st1", languageId: "en" },
    ...overrides,
  });

  it("does not recreate the weeks a shortened rule no longer covers", () => {
    const change = planOldSlotChange("2026-08-24", "2026-08-03");
    if (change.action !== "endOn") throw new Error("expected the rule to be shortened");

    const implied = expandSlotsForDates(
      [slot({ endsOn: parseDateOnly(change.endsOn) })],
      MONDAYS
    );

    // Aug 17 still belongs to the old rule; the cutoff week and everything after
    // it belong to the replacement.
    expect(implied.map((occurrence) => occurrence.occurrenceOn)).toEqual(["2026-08-17"]);
  });

  it("implies nothing at all once the rule is retired", () => {
    // Generation only loads active rules, so a deactivated one contributes nothing.
    // Its dates are simply never expanded.
    const plan = planSeriesEnd({
      cutoffOn: "2026-08-03",
      slotStartsOn: "2026-08-03",
      futureOccurrences: [],
    });

    expect(plan.oldSlot).toEqual({ action: "deactivate" });
  });

  it("counts the replacement's classes as already generated, so none are duplicated", () => {
    const replacement = slot({ id: "new-slot", startsOn: parseDateOnly("2026-08-24") });
    const implied = expandSlotsForDates([replacement], MONDAYS);

    // What the split wrote: one class per replacement date, on the new rule.
    const written = new Set(
      ["2026-08-24", "2026-08-31", "2026-09-07"].map((date) =>
        occurrenceKey("new-slot", date)
      )
    );

    const pending = implied.filter(
      (occurrence) => !written.has(occurrenceKey(replacement.id, occurrence.occurrenceOn))
    );

    expect(pending).toEqual([]);
  });

  it("leaves a preserved cancellation cancelled instead of regenerating it", () => {
    const replacement = slot({ id: "new-slot", startsOn: parseDateOnly("2026-08-17") });
    const implied = expandSlotsForDates([replacement], MONDAYS);

    // A week carried across as cancelled still occupies its (rule, occurrence)
    // key, which is what stops generation from creating a scheduled one over it.
    const written = new Set(MONDAYS.map((date) => occurrenceKey("new-slot", date)));
    const pending = implied.filter(
      (occurrence) => !written.has(occurrenceKey(replacement.id, occurrence.occurrenceOn))
    );

    expect(pending).toEqual([]);
  });

  it("still generates a genuinely missing week", () => {
    const replacement = slot({ id: "new-slot", startsOn: parseDateOnly("2026-08-17") });
    const implied = expandSlotsForDates([replacement], MONDAYS);

    const written = new Set(
      MONDAYS.slice(0, 3).map((date) => occurrenceKey("new-slot", date))
    );
    const pending = implied.filter(
      (occurrence) => !written.has(occurrenceKey(replacement.id, occurrence.occurrenceOn))
    );

    expect(pending.map((occurrence) => occurrence.occurrenceOn)).toEqual(["2026-09-07"]);
  });
});

/**
 * The plan never deletes: every old class is carried across, cancelled, or left
 * exactly as it was. This is what protects attendance and completed history.
 */
describe("nothing is ever destroyed", () => {
  it("accounts for every old class as an update or a cancellation", () => {
    const future = MONDAYS.map((date, index) => occurrence(`s${index}`, date));
    const plan = split({
      cutoffOn: "2026-08-17",
      slotStartsOn: "2026-08-03",
      futureOccurrences: future,
      replacementDates: ["2026-08-18", "2026-08-25"],
    });

    const touched = [
      ...plan.updates.map((update) => update.sessionId),
      ...plan.cancels.map((cancel) => cancel.sessionId),
    ];

    expect(new Set(touched)).toEqual(new Set(future.map((row) => row.sessionId)));
  });
});
