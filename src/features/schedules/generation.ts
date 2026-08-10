import {
  DEFAULT_TIMEZONE,
  datesInMonth,
  formatDateOnly,
  weekdayOfDate,
  zonedToUtc,
} from "@/lib/datetime";

export type GeneratableSlot = {
  id: string;
  weekday: number;
  startTime: string;
  durationMinutes: number;
  startsOn: Date;
  endsOn: Date | null;
  teacherId: string;
  student: { id: string; languageId: string };
};

export type SessionOccurrence = {
  scheduleSlotId: string;
  studentId: string;
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
  const occurrences: SessionOccurrence[] = [];

  for (const date of datesInMonth(year, month)) {
    const weekday = weekdayOfDate(date);

    for (const slot of slots) {
      if (slot.weekday !== weekday) continue;
      if (date < formatDateOnly(slot.startsOn)) continue;
      if (slot.endsOn && date > formatDateOnly(slot.endsOn)) continue;

      occurrences.push({
        scheduleSlotId: slot.id,
        studentId: slot.student.id,
        teacherId: slot.teacherId,
        languageId: slot.student.languageId,
        startsAt: zonedToUtc(date, slot.startTime, timezone),
        durationMinutes: slot.durationMinutes,
        occurrenceOn: date,
      });
    }
  }

  return occurrences;
}
