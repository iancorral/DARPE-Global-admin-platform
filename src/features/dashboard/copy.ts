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
  /**
   * How the month is going, in one line. Both numbers count classes whose
   * start falls in the current academy month: `completed` is what happened,
   * `scheduled` is what is still on the books. `dateLabel` and `monthLabel`
   * arrive already formatted for the academy timezone.
   */
  contextLine: (dateLabel: string, monthLabel: string, completed: number, scheduled: number) =>
    `${dateLabel} · ${completed} ${completed === 1 ? "class" : "classes"} taught in ` +
    `${monthLabel}, ${scheduled} still scheduled.`,
  openCalendar: "Open calendar",

  todayTitle: "Today at DARPE",
  todayEmpty: "No classes today.",
  todayCount: (count: number) => `${count} ${count === 1 ? "class" : "classes"}`,

  attentionTitle: "Needs attention",
  attentionDescription:
    "These classes have finished but are still marked as scheduled. Complete or cancel them so the records reflect what happened.",
  attentionEmpty: "Nothing to resolve. Every class that has finished is completed or cancelled.",
  attentionMore: (count: number) =>
    `And ${count} more — open the calendar weeks above to work through them.`,

  overviewActiveStudents: "Active students",
  overviewTrialDetail: (count: number) => `+ ${count} trial`,
  overviewActiveTeachers: "Active teachers",

  kpiTaughtThisMonth: "Classes taught",
  kpiStillScheduled: "Still scheduled",
  kpiMonthDetail: (monthLabel: string) => `in ${monthLabel}`,

  activityTitle: "Class activity",
  activityDescription: (monthLabel: string) => `${monthLabel}, by week`,
} as const;
