/**
 * Every user-facing string of the dashboard, in one place so a later
 * translation pass touches one file. The UI is English in phase 1 (DESIGN.md
 * §8); nothing here is a business rule.
 */

/**
 * The greeting for an academy wall-clock hour (0–23):
 * before 12:00 "Good morning", 12:00–17:59 "Good afternoon", from 18:00
 * "Good evening". Pure so the boundaries are testable without a clock.
 */
export function greetingForHour(hour: number): string {
  if (hour < 12) return DASHBOARD_COPY.greetingMorning;
  if (hour < 18) return DASHBOARD_COPY.greetingAfternoon;
  return DASHBOARD_COPY.greetingEvening;
}

export const DASHBOARD_COPY = {
  greetingMorning: "Good morning",
  greetingAfternoon: "Good afternoon",
  greetingEvening: "Good evening",
  /** `dateLabel` arrives already formatted for the academy timezone. */
  contextLine: (dateLabel: string) => `${dateLabel} · Here's how DARPE is doing today.`,
  openCalendar: "Open calendar",

  todayTitle: "Today at DARPE",
  todayEmpty: "No classes today. A quiet day is still a day at DARPE.",

  attentionTitle: "Needs attention",
  attentionDescription:
    "Past classes still marked as scheduled. Complete or cancel them so the records reflect what happened.",
  attentionEmpty: "Nothing needs attention. Every past class is completed or cancelled.",
  attentionMore: (count: number) =>
    `And ${count} more — open the calendar weeks above to work through them.`,

  upcomingTitle: "Coming up",
  upcomingEmpty:
    "No upcoming classes yet. Recurring schedules become classes once the month is generated.",

  overviewTitle: "Operational overview",
  overviewThisWeek: "Classes this week",
  overviewActiveStudents: "Active students",
  overviewTrialDetail: (count: number) => `+ ${count} trial`,
  overviewActiveTeachers: "Active teachers",
  overviewWeekDetail: (completed: number, cancelled: number) =>
    `${completed} completed · ${cancelled} cancelled`,
} as const;
