import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_TIMEZONE, formatInZone, startOfWeekDate } from "@/lib/datetime";
import { dashboardWindows } from "./windows";
import { certainlyEndedBefore, hasFullyEnded } from "./overdue";
import { describeActivity, groupActivityByWeek, type ActivityWeek } from "./activity";
import type { ClassStatus, StudentStatus } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

/** One class as the dashboard lists it: when, who, and where to see it. */
export type DashboardSession = {
  id: string;
  /** "HH:mm" in the academy timezone. */
  startLabel: string;
  /** Academy date, e.g. "Mon, Aug 10". Today's list leaves it out. */
  dateLabel: string;
  /** Link target: the calendar week containing this class. */
  weekHref: string;
  status: ClassStatus;
  studentName: string;
  teacherName: string;
  languageName: string;
};

export type DashboardData = {
  todayLabel: string;
  /** The current academy month, e.g. "August". */
  monthLabel: string;
  calendarHref: string;
  today: DashboardSession[];
  needCompletion: DashboardSession[];
  needCompletionCount: number;
  studentCounts: Record<StudentStatus, number>;
  activeTeacherCount: number;
  /**
   * Classes whose start falls in the current academy month, by status.
   * `completed` is what actually happened; `scheduled` is what is still on the
   * books for the month, whether or not its time has passed.
   */
  monthCompletedCount: number;
  monthScheduledCount: number;
  /** This month's classes bucketed by week, for the activity chart. */
  activityWeeks: ActivityWeek[];
  activitySummary: string;
  /** First day of the current academy month, for the finance provider. */
  monthStartDate: string;
};

const SESSION_SELECT = {
  id: true,
  startsAt: true,
  durationMinutes: true,
  status: true,
  teacher: { select: { firstName: true, lastName: true } },
  language: { select: { name: true } },
  participants: {
    select: { student: { select: { firstName: true, lastName: true } } },
    take: 1,
  },
} satisfies Prisma.ClassSessionSelect;

type SessionRow = Prisma.ClassSessionGetPayload<{ select: typeof SESSION_SELECT }>;

function toDashboardSession(session: SessionRow): DashboardSession {
  const date = formatInZone(session.startsAt, DEFAULT_TIMEZONE, "yyyy-MM-dd");
  const student = session.participants[0]?.student;

  return {
    id: session.id,
    startLabel: formatInZone(session.startsAt, DEFAULT_TIMEZONE),
    dateLabel: formatInZone(session.startsAt, DEFAULT_TIMEZONE, "EEE, MMM d"),
    weekHref: `/calendar?week=${startOfWeekDate(date)}`,
    status: session.status,
    studentName: student ? `${student.firstName} ${student.lastName}` : "Class",
    teacherName: `${session.teacher.firstName} ${session.teacher.lastName}`,
    languageName: session.language.name,
  };
}

/**
 * Everything the dashboard shows, read in parallel with the smallest selects
 * that can answer it. All windows come from `dashboardWindows`, so "today",
 * "still open" and "this week" agree with each other and with the academy
 * clock rather than the server's.
 */
export async function getDashboardData(now: Date = new Date()): Promise<DashboardData> {
  const windows = dashboardWindows(now, DEFAULT_TIMEZONE);
  // Split point for "has this class finished?": everything older than this has
  // certainly ended, everything between it and now has to be checked row by row.
  const endedCutoff = certainlyEndedBefore(now);

  const [
    today,
    settledOverdue,
    settledOverdueCount,
    recentlyStarted,
    monthSessions,
    studentGroups,
    activeTeacherCount,
  ] = await Promise.all([
    db.classSession.findMany({
      where: { startsAt: { gte: windows.todayStart, lt: windows.tomorrowStart } },
      select: SESSION_SELECT,
      orderBy: { startsAt: "asc" },
    }),
    /*
     * Classes that are over and still scheduled, in two parts, because SQL
     * cannot compare a row's start plus its own duration against now.
     *
     * Old enough to have certainly ended: an indexed range, counted in the
     * database. Oldest first — the longer one has been open, the more it needs
     * resolving.
     */
    db.classSession.findMany({
      where: { status: "SCHEDULED", startsAt: { lt: endedCutoff } },
      select: SESSION_SELECT,
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    db.classSession.count({
      where: { status: "SCHEDULED", startsAt: { lt: endedCutoff } },
    }),
    // Started within the window: at most a day of classes, judged individually
    // against their own end time.
    db.classSession.findMany({
      where: { status: "SCHEDULED", startsAt: { gte: endedCutoff, lt: now } },
      select: SESSION_SELECT,
      orderBy: { startsAt: "asc" },
    }),
    // Two fields per class for the whole month: enough to bucket by week and
    // by status, and nothing that identifies anybody.
    db.classSession.findMany({
      where: { startsAt: { gte: windows.monthStart, lt: windows.nextMonthStart } },
      select: { startsAt: true, status: true },
    }),
    db.student.groupBy({ by: ["status"], _count: { _all: true } }),
    db.teacher.count({ where: { active: true } }),
  ]);

  const justEnded = recentlyStarted.filter((session) => hasFullyEnded(session, now));
  const needCompletion = [...settledOverdue, ...justEnded].slice(0, 5);
  const needCompletionCount = settledOverdueCount + justEnded.length;

  const studentCounts: Record<StudentStatus, number> = {
    TRIAL: 0,
    ACTIVE: 0,
    PAUSED: 0,
    ARCHIVED: 0,
  };
  for (const group of studentGroups) {
    studentCounts[group.status] = group._count._all;
  }

  // Bucketed on the academy date of each class, so a late-evening class counts
  // in the day staff taught it rather than the UTC day it was stored under.
  const monthActivity = monthSessions.map((session) => ({
    date: formatInZone(session.startsAt, DEFAULT_TIMEZONE, "yyyy-MM-dd"),
    status: session.status,
  }));

  const monthEndDate = formatInZone(
    new Date(windows.nextMonthStart.getTime() - 1),
    DEFAULT_TIMEZONE,
    "yyyy-MM-dd"
  );
  const monthLabel = formatInZone(windows.monthStart, DEFAULT_TIMEZONE, "MMMM");
  const activityWeeks = groupActivityByWeek(
    monthActivity,
    windows.monthStartDate,
    monthEndDate
  );

  const monthCompletedCount = monthActivity.filter(
    (item) => item.status === "COMPLETED"
  ).length;
  const monthScheduledCount = monthActivity.filter(
    (item) => item.status === "SCHEDULED"
  ).length;

  return {
    todayLabel: formatInZone(windows.todayStart, DEFAULT_TIMEZONE, "EEEE, MMMM d"),
    monthLabel,
    calendarHref: `/calendar?week=${windows.weekStartDate}`,
    today: today.map(toDashboardSession),
    needCompletion: needCompletion.map(toDashboardSession),
    needCompletionCount,
    studentCounts,
    activeTeacherCount,
    monthCompletedCount,
    monthScheduledCount,
    activityWeeks,
    activitySummary: describeActivity(activityWeeks, monthLabel),
    monthStartDate: windows.monthStartDate,
  };
}
