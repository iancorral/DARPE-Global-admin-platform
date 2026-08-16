import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_TIMEZONE, formatInZone, startOfWeekDate } from "@/lib/datetime";
import { dashboardWindows } from "@/features/dashboard/windows";
import type { ClassStatus, StudentStatus } from "@/generated/prisma/client";

export type TeacherListRow = {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
  languageNames: string[];
  studentCount: number;
};

/**
 * Every teacher, active or not, in the fields the list shows. Inactive teachers
 * must stay visible here: this list is the only place one can be found again
 * and reactivated. Everything that schedules classes keeps its own
 * active-teachers-only queries.
 */
export async function getTeacherRows(): Promise<TeacherListRow[]> {
  const teachers = await db.teacher.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      active: true,
      languages: { select: { language: { select: { name: true } } } },
      _count: { select: { primaryStudents: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return teachers.map((teacher) => ({
    id: teacher.id,
    name: `${teacher.firstName} ${teacher.lastName}`,
    email: teacher.email,
    active: teacher.active,
    languageNames: teacher.languages.map((entry) => entry.language.name),
    studentCount: teacher._count.primaryStudents,
  }));
}

export async function getTeacherById(id: string) {
  return db.teacher.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      active: true,
      languages: { select: { languageId: true } },
    },
  });
}

export type TeacherUpcomingSession = {
  id: string;
  /** e.g. "Mon, Aug 10" in the academy timezone. */
  dateLabel: string;
  /** "HH:mm" in the academy timezone. */
  startLabel: string;
  durationMinutes: number;
  status: ClassStatus;
  studentName: string;
  languageName: string;
  weekHref: string;
};

export type TeacherProfileData = {
  id: string;
  name: string;
  active: boolean;
  email: string | null;
  phone: string | null;
  languageNames: string[];
  /** Students whose primary teacher this is, minus archived ones. */
  students: { id: string; name: string; languageName: string; status: StudentStatus }[];
  upcoming: TeacherUpcomingSession[];
  upcomingCount: number;
  /**
   * This academy week's classes (Monday through Sunday in America/Chihuahua),
   * counted by status. Scheduled and completed describe real workload;
   * cancelled is shown for context and occupies no time.
   */
  weekCounts: Record<ClassStatus, number>;
};

/**
 * Everything the teacher profile shows, in parallel minimal reads. Only facts
 * the database holds: no hours, rates or earnings — those wait for the finance
 * phase and real financial records.
 */
export async function getTeacherProfile(
  id: string,
  now: Date = new Date()
): Promise<TeacherProfileData | null> {
  const windows = dashboardWindows(now, DEFAULT_TIMEZONE);

  const [teacher, students, upcoming, upcomingCount, weekGroups] = await Promise.all([
    db.teacher.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        active: true,
        languages: { select: { language: { select: { name: true } } } },
      },
    }),
    db.student.findMany({
      where: { primaryTeacherId: id, status: { not: "ARCHIVED" } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        language: { select: { name: true } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    db.classSession.findMany({
      where: { teacherId: id, startsAt: { gte: now } },
      select: {
        id: true,
        startsAt: true,
        durationMinutes: true,
        status: true,
        language: { select: { name: true } },
        participants: {
          select: { student: { select: { firstName: true, lastName: true } } },
          take: 1,
        },
      },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
    db.classSession.count({ where: { teacherId: id, startsAt: { gte: now } } }),
    db.classSession.groupBy({
      by: ["status"],
      where: {
        teacherId: id,
        startsAt: { gte: windows.weekStart, lt: windows.nextWeekStart },
      },
      _count: { _all: true },
    }),
  ]);

  if (!teacher) return null;

  const weekCounts: Record<ClassStatus, number> = {
    SCHEDULED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };
  for (const group of weekGroups) {
    weekCounts[group.status] = group._count._all;
  }

  return {
    id: teacher.id,
    name: `${teacher.firstName} ${teacher.lastName}`,
    active: teacher.active,
    email: teacher.email,
    phone: teacher.phone,
    languageNames: teacher.languages.map((entry) => entry.language.name),
    students: students.map((student) => ({
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      languageName: student.language.name,
      status: student.status,
    })),
    upcoming: upcoming.map((session) => {
      const date = formatInZone(session.startsAt, DEFAULT_TIMEZONE, "yyyy-MM-dd");
      const student = session.participants[0]?.student;

      return {
        id: session.id,
        dateLabel: formatInZone(session.startsAt, DEFAULT_TIMEZONE, "EEE, MMM d"),
        startLabel: formatInZone(session.startsAt, DEFAULT_TIMEZONE),
        durationMinutes: session.durationMinutes,
        status: session.status,
        studentName: student ? `${student.firstName} ${student.lastName}` : "Class",
        languageName: session.language.name,
        weekHref: `/calendar?week=${startOfWeekDate(date)}&teacher=${teacher.id}`,
      };
    }),
    upcomingCount,
    weekCounts,
  };
}

export async function getLanguageOptions() {
  return db.language.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
