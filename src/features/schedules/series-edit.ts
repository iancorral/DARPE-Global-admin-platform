import type { ClassStatus } from "@/generated/prisma/client";
import { addDaysToDate } from "@/lib/datetime";

/**
 * Changing a recurring series from one of its classes onward.
 *
 * A recurring rule describes what a week means, so editing one in place would
 * rewrite what every past week meant too. Instead the old rule is *split*: it is
 * ended the day before the class the user selected, and a replacement rule takes
 * over from there. History keeps the rule that produced it, and the change reads
 * as "this is how it works from now on" rather than "it was always like this".
 *
 * Everything here is pure. It decides what a split consists of; the action decides
 * whether it is allowed and writes it in one transaction.
 */

/** A class this slot already produced at or after the cutoff. */
export type FutureOccurrence = {
  sessionId: string;
  /**
   * The occurrence this class stands for — `slotOccurrenceOn`, never `startsAt`.
   * A class moved to another day is still the week it was generated for, and that
   * is the identity the series is reorganised by.
   */
  occurrenceOn: string;
  status: ClassStatus;
  hasParticipant: boolean;
};

export type OldSlotChange =
  | { action: "deactivate" }
  | { action: "endOn"; endsOn: string };

export type MappedUpdate = {
  sessionId: string;
  /** The replacement occurrence this class becomes. */
  occurrenceOn: string;
  /** Cancelled classes stay cancelled; everything else is scheduled. */
  status: ClassStatus;
  /** Defensive: an existing class with no participant row gets one. */
  needsParticipant: boolean;
};

export type SeriesSplitPlan = {
  oldSlot: OldSlotChange;
  /** Old classes carried onto replacement dates, by chronological ordinal. */
  updates: MappedUpdate[];
  /** Replacement dates with no old class to reuse. */
  creates: { occurrenceOn: string }[];
  /** Old scheduled classes the shorter replacement no longer covers. */
  cancels: { sessionId: string }[];
  /**
   * The dates the replacement will actually occupy the teacher on — scheduled
   * only, because a cancelled class frees its time.
   */
  occupiedDates: string[];
};

export type SeriesSplitResult =
  | { ok: true; plan: SeriesSplitPlan }
  | { ok: false; error: string };

export const COMPLETED_IN_FUTURE_MESSAGE =
  "This series already has a completed class from this date onward, and completed " +
  "classes are a record of what happened. Edit only this class, or start the change " +
  "from a later week.";

/**
 * How the old rule ends.
 *
 * Ending it the day before the cutoff leaves every earlier week exactly as it was.
 * When the cutoff *is* the rule's first occurrence there is no earlier week to
 * keep, and an end date before the start date would be a range that describes
 * nothing — so the rule is deactivated instead.
 */
export function planOldSlotChange(cutoffOn: string, slotStartsOn: string): OldSlotChange {
  return cutoffOn <= slotStartsOn
    ? { action: "deactivate" }
    : { action: "endOn", endsOn: addDaysToDate(cutoffOn, -1) };
}

/**
 * What replacing a series from one class onward consists of.
 *
 * Old future classes are matched to replacement dates by chronological ordinal —
 * first to first, second to second — so a series that shifts to another weekday or
 * another time carries its classes with it instead of abandoning them and creating
 * a parallel set. That deliberately overwrites individual reschedules made to
 * those future weeks, which is exactly what "this and future classes" asks for and
 * what the dialog warns about.
 *
 * Nothing is ever deleted: a week the replacement no longer covers is cancelled,
 * so the record of it survives and the time is freed.
 */
export function planSeriesSplit(params: {
  cutoffOn: string;
  slotStartsOn: string;
  futureOccurrences: FutureOccurrence[];
  replacementDates: string[];
}): SeriesSplitResult {
  const { cutoffOn, slotStartsOn, replacementDates } = params;

  // Sorted by the occurrence they stand for, so the ordinal mapping is stable no
  // matter what order the rows arrived in or where they were moved to.
  const future = [...params.futureOccurrences].sort((a, b) =>
    a.occurrenceOn < b.occurrenceOn ? -1 : a.occurrenceOn > b.occurrenceOn ? 1 : 0
  );

  if (future.some((occurrence) => occurrence.status === "COMPLETED")) {
    return { ok: false, error: COMPLETED_IN_FUTURE_MESSAGE };
  }

  if (replacementDates.length === 0) {
    return { ok: false, error: "That date range contains no classes." };
  }

  const updates: MappedUpdate[] = [];
  const creates: { occurrenceOn: string }[] = [];
  const cancels: { sessionId: string }[] = [];
  const occupiedDates: string[] = [];

  const shared = Math.min(future.length, replacementDates.length);

  for (let index = 0; index < shared; index += 1) {
    const occurrence = future[index];
    const occurrenceOn = replacementDates[index];
    if (!occurrence || !occurrenceOn) continue;

    // A week somebody cancelled stays cancelled wherever it lands, so the decision
    // is not quietly undone and generation cannot bring it back as scheduled.
    const status: ClassStatus = occurrence.status === "CANCELLED" ? "CANCELLED" : "SCHEDULED";

    updates.push({
      sessionId: occurrence.sessionId,
      occurrenceOn,
      status,
      needsParticipant: !occurrence.hasParticipant,
    });

    if (status === "SCHEDULED") occupiedDates.push(occurrenceOn);
  }

  for (let index = shared; index < replacementDates.length; index += 1) {
    const occurrenceOn = replacementDates[index];
    if (!occurrenceOn) continue;

    creates.push({ occurrenceOn });
    occupiedDates.push(occurrenceOn);
  }

  for (let index = shared; index < future.length; index += 1) {
    const occurrence = future[index];
    if (!occurrence) continue;

    // Already-cancelled surplus needs no write; it is already what it should be.
    if (occurrence.status === "SCHEDULED") cancels.push({ sessionId: occurrence.sessionId });
  }

  return {
    ok: true,
    plan: {
      oldSlot: planOldSlotChange(cutoffOn, slotStartsOn),
      updates,
      creates,
      cancels,
      occupiedDates,
    },
  };
}

export type SeriesEndPlan = {
  oldSlot: OldSlotChange;
  /** Scheduled classes at or after the cutoff, which become cancelled. */
  cancelSessionIds: string[];
};

/**
 * Ending a series from one class onward.
 *
 * The same cutoff and the same rule-ending as a split, without a replacement.
 * Completed weeks and already-cancelled weeks are left exactly as they are: this
 * cancels what is still going to happen, and changes nothing about what did.
 */
export function planSeriesEnd(params: {
  cutoffOn: string;
  slotStartsOn: string;
  futureOccurrences: FutureOccurrence[];
}): SeriesEndPlan {
  return {
    oldSlot: planOldSlotChange(params.cutoffOn, params.slotStartsOn),
    cancelSessionIds: params.futureOccurrences
      .filter((occurrence) => occurrence.status === "SCHEDULED")
      .map((occurrence) => occurrence.sessionId),
  };
}
