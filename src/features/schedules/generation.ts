import {
  DEFAULT_TIMEZONE,
  datesInMonth,
  formatDateOnly,
  weekdayOfDate,
  zonedToUtc,
} from "@/lib/datetime";

/**
 * A recurring pattern, flattened to what expansion needs.
 *
 * The audience is already resolved by the caller: `studentIds` holds one
 * student for an individual pattern and every member for a group one, and
 * `groupId` says which of the two it is. Flattening it here keeps expansion
 * indifferent to the distinction — a group class is the same class with more
 * people in it.
 */
export type GeneratableSlot = {
  id: string;
  weekday: number;
  startTime: string;
  durationMinutes: number;
  startsOn: Date;
  endsOn: Date | null;
  teacherId: string;
  languageId: string;
  studentIds: string[];
  groupId: string | null;
};

export type SessionOccurrence = {
  scheduleSlotId: string;
  studentIds: string[];
  groupId: string | null;
  teacherId: string;
  languageId: string;
  startsAt: Date;
  durationMinutes: number;
  occurrenceOn: string;
};

/**
 * Identifies a slot occurrence by the calendar date it belongs to rather than by
 * its start time, so a rescheduled session is still recognised as generated.
 */
export function occurrenceKey(scheduleSlotId: string, occurrenceOn: string): string {
  return `${scheduleSlotId}|${occurrenceOn}`;
}

/**
 * Expands recurring slots into the concrete sessions they imply for one month.
 * Pure: it reads nothing and writes nothing, so callers decide what to persist.
 */
export function expandSlotsForMonth(
  slots: GeneratableSlot[],
  year: number,
  month: number,
  timezone: string = DEFAULT_TIMEZONE
): SessionOccurrence[] {
  return expandSlotsForDates(slots, datesInMonth(year, month), timezone);
}

/**
 * The same expansion over any set of calendar dates.
 *
 * Monthly generation asks for a month; booking a new series asks only about the
 * days that series lands on, to find out whether a recurring pattern already
 * claims the teacher then — including patterns whose sessions have not been
 * generated yet. Both go through this, so "what does this pattern imply" has one
 * answer in the product.
 */
export function expandSlotsForDates(
  slots: GeneratableSlot[],
  dates: string[],
  timezone: string = DEFAULT_TIMEZONE
): SessionOccurrence[] {
  const occurrences: SessionOccurrence[] = [];

  for (const date of dates) {
    const weekday = weekdayOfDate(date);

    for (const slot of slots) {
      if (slot.weekday !== weekday) continue;
      if (date < formatDateOnly(slot.startsOn)) continue;
      if (slot.endsOn && date > formatDateOnly(slot.endsOn)) continue;

      occurrences.push({
        scheduleSlotId: slot.id,
        studentIds: slot.studentIds,
        groupId: slot.groupId,
        teacherId: slot.teacherId,
        languageId: slot.languageId,
        startsAt: zonedToUtc(date, slot.startTime, timezone),
        durationMinutes: slot.durationMinutes,
        occurrenceOn: date,
      });
    }
  }

  return occurrences;
}

/**
 * Whether an occurrence is a group class. Derived from the pattern's audience
 * rather than stored twice, so the two can never disagree.
 */
export function occurrenceClassType(
  occurrence: Pick<SessionOccurrence, "groupId">
): "INDIVIDUAL" | "GROUP" {
  return occurrence.groupId ? "GROUP" : "INDIVIDUAL";
}

/**
 * A pattern's audience as the database hands it over: one side is always null.
 */
export type SlotAudienceSource = {
  student: { id: string; languageId: string } | null;
  group: { id: string; languageId: string; members: { studentId: string }[] } | null;
};

export type SlotAudience = {
  languageId: string;
  studentIds: string[];
  groupId: string | null;
};

/**
 * Resolves who a recurring pattern is for.
 *
 * The language comes from whichever side is set — the student's own for an
 * individual pattern, the group's for a group one — so a class can never be
 * generated in a language its audience does not study.
 *
 * Returns null when neither side is set, or when a group has no members yet: a
 * class with nobody in it is not a class, and generating one would put an empty
 * card on the calendar and occupy the teacher for nothing. A check constraint
 * already stops both sides being set at once.
 */
export function slotAudience(source: SlotAudienceSource): SlotAudience | null {
  if (source.student) {
    return {
      languageId: source.student.languageId,
      studentIds: [source.student.id],
      groupId: null,
    };
  }

  if (source.group && source.group.members.length > 0) {
    return {
      languageId: source.group.languageId,
      studentIds: source.group.members.map((member) => member.studentId),
      groupId: source.group.id,
    };
  }

  return null;
}
