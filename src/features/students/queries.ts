import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_TIMEZONE, formatInZone, startOfWeekDate } from "@/lib/datetime";
import type { Attendance, ClassStatus, StudentStatus } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

export type StudentListRow = {
  id: string;
  name: string;
  languageName: string;
  teacherName: string | null;
  level: string | null;
  status: StudentStatus;
};

/**
 * Every student, in exactly the fields the list shows. Archived students are
 * included — hiding them is the list's default filter, not the query's — so the
 * list is also where an archived student is found again and reactivated.
 * Deliberately no contact fields: the rows travel to a client component for
 * filtering, and the list has no business holding emails or phones.
 */
export async function getStudentRows(): Promise<StudentListRow[]> {
  const students = await db.student.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      level: true,
      status: true,
      language: { select: { name: true } },
      primaryTeacher: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return students.map((student) => ({
    id: student.id,
    name: `${student.firstName} ${student.lastName}`,
    languageName: student.language.name,
    teacherName: student.primaryTeacher
      ? `${student.primaryTeacher.firstName} ${student.primaryTeacher.lastName}`
      : null,
    level: student.level,
    status: student.status,
  }));
}

export async function getStudentFormOptions() {
  const [languages, teachers] = await Promise.all([
    db.language.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.teacher.findMany({
      where: { active: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return { languages, teachers };
}

/** One of this student's concrete classes, as the profile lists it. */
export type StudentSessionRow = {
  id: string;
  /** e.g. "Mon, Aug 10" in the academy timezone. */
  dateLabel: string;
  /** "HH:mm" in the academy timezone. */
  startLabel: string;
  durationMinutes: number;
  status: ClassStatus;
  teacherName: string;
  languageName: string;
  /** This student's own attendance on the class, when recorded. */
  attendance: Attendance | null;
  /** The calendar week holding this class. */
  weekHref: string;
};

export type StudentSessions = {
  upcoming: StudentSessionRow[];
  history: StudentSessionRow[];
  upcomingCount: number;
  historyCount: number;
};

const STUDENT_SESSION_SELECT = (studentId: string) =>
  ({
    id: true,
    startsAt: true,
    durationMinutes: true,
    status: true,
    teacher: { select: { firstName: true, lastName: true } },
    language: { select: { name: true } },
    // Only this student's participant row, and only its attendance: the class
    // may one day have other participants, and their results are not this page's.
    participants: {
      where: { studentId },
      select: { attendance: true },
    },
  }) satisfies Prisma.ClassSessionSelect;

type StudentSessionRecord = Prisma.ClassSessionGetPayload<{
  select: ReturnType<typeof STUDENT_SESSION_SELECT>;
}>;

function toStudentSessionRow(session: StudentSessionRecord): StudentSessionRow {
  const date = formatInZone(session.startsAt, DEFAULT_TIMEZONE, "yyyy-MM-dd");

  return {
    id: session.id,
    dateLabel: formatInZone(session.startsAt, DEFAULT_TIMEZONE, "EEE, MMM d"),
    startLabel: formatInZone(session.startsAt, DEFAULT_TIMEZONE),
    durationMinutes: session.durationMinutes,
    status: session.status,
    teacherName: `${session.teacher.firstName} ${session.teacher.lastName}`,
    languageName: session.language.name,
    attendance: session.participants[0]?.attendance ?? null,
    weekHref: `/calendar?week=${startOfWeekDate(date)}`,
  };
}

/**
 * The student's concrete classes around now: the next few coming up and the
 * most recent past ones, each bounded. Older classes are not paginated here —
 * the counts say how many exist, and the calendar remains the place to browse
 * a specific week. "Past" and "upcoming" split on the actual instant, so a
 * class earlier today already reads as history once its start time has gone by.
 */
export async function getStudentSessions(
  studentId: string,
  now: Date = new Date()
): Promise<StudentSessions> {
  const select = STUDENT_SESSION_SELECT(studentId);
  const forStudent = { participants: { some: { studentId } } };

  const [upcoming, history, upcomingCount, historyCount] = await Promise.all([
    db.classSession.findMany({
      where: { ...forStudent, startsAt: { gte: now } },
      select,
      orderBy: { startsAt: "asc" },
      take: 10,
    }),
    db.classSession.findMany({
      where: { ...forStudent, startsAt: { lt: now } },
      select,
      orderBy: { startsAt: "desc" },
      take: 15,
    }),
    db.classSession.count({ where: { ...forStudent, startsAt: { gte: now } } }),
    db.classSession.count({ where: { ...forStudent, startsAt: { lt: now } } }),
  ]);

  return {
    upcoming: upcoming.map(toStudentSessionRow),
    history: history.map(toStudentSessionRow),
    upcomingCount,
    historyCount,
  };
}

export async function getStudentById(id: string) {
  return db.student.findUnique({
    where: { id },
    include: {
      language: { select: { id: true, name: true } },
      primaryTeacher: { select: { id: true, firstName: true, lastName: true } },
      scheduleSlots: {
        where: { active: true },
        include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
      },
    },
  });
}