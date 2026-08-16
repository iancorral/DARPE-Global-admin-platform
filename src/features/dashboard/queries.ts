import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_TIMEZONE, formatInZone, startOfWeekDate } from "@/lib/datetime";
import { dashboardWindows } from "./windows";
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
  calendarHref: string;
  today: DashboardSession[];
  upcoming: DashboardSession[];
  needCompletion: DashboardSession[];
  needCompletionCount: number;
  weekCounts: Record<ClassStatus, number>;
  studentCounts: Record<StudentStatus, number>;
  activeTeacherCount: number;
};

const SESSION_SELECT = {
  id: true,
  startsAt: true,
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

  const [today, upcoming, needCompletion, needCompletionCount, weekGroups, studentGroups, activeTeacherCount] =
    await Promise.all([
      db.classSession.findMany({
        where: { startsAt: { gte: windows.todayStart, lt: windows.tomorrowStart } },
        select: SESSION_SELECT,
        orderBy: { startsAt: "asc" },
      }),
      db.classSession.findMany({
        where: { status: "SCHEDULED", startsAt: { gte: windows.tomorrowStart } },
        select: SESSION_SELECT,
        orderBy: { startsAt: "asc" },
        take: 5,
      }),
      // Past classes still marked scheduled: each needs to be completed or
      // cancelled before the records mean anything. Oldest first — the longer
      // one has been open, the more it needs attention.
      db.classSession.findMany({
        where: { status: "SCHEDULED", startsAt: { lt: windows.todayStart } },
        select: SESSION_SELECT,
        orderBy: { startsAt: "asc" },
        take: 5,
      }),
      db.classSession.count({
        where: { status: "SCHEDULED", startsAt: { lt: windows.todayStart } },
      }),
      db.classSession.groupBy({
        by: ["status"],
        where: { startsAt: { gte: windows.weekStart, lt: windows.nextWeekStart } },
        _count: { _all: true },
      }),
      db.student.groupBy({ by: ["status"], _count: { _all: true } }),
      db.teacher.count({ where: { active: true } }),
    ]);

  const weekCounts: Record<ClassStatus, number> = {
    SCHEDULED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };
  for (const group of weekGroups) {
    weekCounts[group.status] = group._count._all;
  }

  const studentCounts: Record<StudentStatus, number> = {
    TRIAL: 0,
    ACTIVE: 0,
    PAUSED: 0,
    ARCHIVED: 0,
  };
  for (const group of studentGroups) {
    studentCounts[group.status] = group._count._all;
  }

  return {
    todayLabel: formatInZone(windows.todayStart, DEFAULT_TIMEZONE, "EEEE, MMMM d"),
    calendarHref: `/calendar?week=${windows.weekStartDate}`,
    today: today.map(toDashboardSession),
    upcoming: upcoming.map(toDashboardSession),
    needCompletion: needCompletion.map(toDashboardSession),
    needCompletionCount,
    weekCounts,
    studentCounts,
    activeTeacherCount,
  };
}
