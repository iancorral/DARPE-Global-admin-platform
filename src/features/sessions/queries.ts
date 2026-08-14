import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_TIMEZONE, addDaysToDate, formatInZone, zonedToUtc } from "@/lib/datetime";
import { ELIGIBLE_STUDENT_STATUSES } from "./eligibility";
import { TEACHER_OCCUPYING_STATUSES } from "./lifecycle";
import type { Attendance, ClassStatus } from "@/generated/prisma/client";

export type SessionParticipant = {
  id: string;
  studentName: string;
  attendance: Attendance | null;
};

export type CalendarSession = {
  id: string;
  date: string;
  startMinutes: number;
  durationMinutes: number;
  startLabel: string;
  endLabel: string;
  status: ClassStatus;
  languageId: string;
  languageName: string;
  teacherId: string;
  teacherName: string;
  participants: SessionParticipant[];
  isGenerated: boolean;
};

type SessionRecord = Awaited<ReturnType<typeof findWeekSessions>>[number];

function findWeekSessions(start: Date, end: Date, teacherId?: string) {
  return db.classSession.findMany({
    where: {
      startsAt: { gte: start, lt: end },
      ...(teacherId && { teacherId }),
    },
    include: {
      teacher: { select: { id: true, firstName: true, lastName: true } },
      language: { select: { id: true, name: true } },
      participants: {
        include: { student: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
    orderBy: { startsAt: "asc" },
  });
}

function toCalendarSession(session: SessionRecord): CalendarSession {
  const startLabel = formatInZone(session.startsAt, DEFAULT_TIMEZONE);
  const [hours = "0", minutes = "0"] = startLabel.split(":");
  const endsAt = new Date(session.startsAt.getTime() + session.durationMinutes * 60_000);

  return {
    id: session.id,
    date: formatInZone(session.startsAt, DEFAULT_TIMEZONE, "yyyy-MM-dd"),
    startMinutes: Number(hours) * 60 + Number(minutes),
    durationMinutes: session.durationMinutes,
    startLabel,
    endLabel: formatInZone(endsAt, DEFAULT_TIMEZONE),
    status: session.status,
    languageId: session.language.id,
    languageName: session.language.name,
    teacherId: session.teacher.id,
    teacherName: `${session.teacher.firstName} ${session.teacher.lastName}`,
    participants: session.participants.map((participant) => ({
      id: participant.id,
      studentName: `${participant.student.firstName} ${participant.student.lastName}`,
      attendance: participant.attendance,
    })),
    isGenerated: session.scheduleSlotId !== null,
  };
}

export type MovingSession = {
  id: string;
  date: string;
  startMinutes: number;
  startLabel: string;
  durationMinutes: number;
  teacherId: string;
  teacherName: string;
  studentName: string;
  languageName: string;
};

/**
 * The class move mode is currently moving, or null.
 *
 * Move mode is held in the URL so it survives navigating to another week, which
 * means the id arrives from the address bar and is not trusted: a class that is
 * completed, cancelled or gone simply cannot be moved, and the calendar renders
 * normally instead.
 */
export async function getMovableSession(id: string): Promise<MovingSession | null> {
  const session = await db.classSession.findUnique({
    where: { id },
    select: {
      id: true,
      startsAt: true,
      durationMinutes: true,
      status: true,
      teacherId: true,
      teacher: { select: { firstName: true, lastName: true } },
      language: { select: { name: true } },
      participants: {
        select: { student: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  if (!session || session.status !== "SCHEDULED") {
    return null;
  }

  const startLabel = formatInZone(session.startsAt, DEFAULT_TIMEZONE);
  const [hours = "0", minutes = "0"] = startLabel.split(":");
  const student = session.participants[0]?.student;

  return {
    id: session.id,
    date: formatInZone(session.startsAt, DEFAULT_TIMEZONE, "yyyy-MM-dd"),
    startMinutes: Number(hours) * 60 + Number(minutes),
    startLabel,
    durationMinutes: session.durationMinutes,
    teacherId: session.teacherId,
    teacherName: `${session.teacher.firstName} ${session.teacher.lastName}`,
    studentName: student ? `${student.firstName} ${student.lastName}` : "Class",
    languageName: session.language.name,
  };
}

/**
 * A block of a teacher's week that is already taken, as minutes within its day.
 *
 * Deliberately anonymous: classifying a destination only needs when the teacher is
 * busy, never who with. No student, teacher, language or attendance detail is sent,
 * so a move never leaks a class the visible calendar was not already showing.
 */
export type TeacherBusyBlock = {
  date: string;
  startMinutes: number;
  durationMinutes: number;
};

/**
 * When the teacher of the class being moved is already booked, for one week.
 *
 * Loaded separately from the calendar's own sessions on purpose. The teacher filter
 * is a display choice — it decides which cards are drawn — and must never decide
 * which classes count as a conflict, or filtering to a colleague would make every
 * destination look free. Scoped to this one teacher, so it stays the smallest read
 * that can answer the question.
 *
 * Cancelled classes are left out: they free the teacher's time. Completed ones are
 * kept, because they actually happened. The moved class excludes itself, so its own
 * current time reads as its original position rather than as a conflict.
 */
export async function getTeacherWeekAvailability(
  teacherId: string,
  weekStart: string,
  excludeSessionId: string
): Promise<TeacherBusyBlock[]> {
  const start = zonedToUtc(weekStart, "00:00", DEFAULT_TIMEZONE);
  const end = zonedToUtc(addDaysToDate(weekStart, 7), "00:00", DEFAULT_TIMEZONE);

  const busy = await db.classSession.findMany({
    where: {
      teacherId,
      id: { not: excludeSessionId },
      status: { in: TEACHER_OCCUPYING_STATUSES },
      startsAt: { gte: start, lt: end },
    },
    select: { startsAt: true, durationMinutes: true },
    orderBy: { startsAt: "asc" },
  });

  return busy.map((session) => {
    const [hours = "0", minutes = "0"] = formatInZone(session.startsAt, DEFAULT_TIMEZONE).split(":");

    return {
      date: formatInZone(session.startsAt, DEFAULT_TIMEZONE, "yyyy-MM-dd"),
      startMinutes: Number(hours) * 60 + Number(minutes),
      durationMinutes: session.durationMinutes,
    };
  });
}

export type CreateClassStudent = {
  id: string;
  name: string;
  languageId: string;
  languageName: string;
  primaryTeacherId: string | null;
};

export type CreateClassTeacher = {
  id: string;
  name: string;
  languageIds: string[];
};

/**
 * The students and teachers the create-class form may offer.
 *
 * This only narrows what staff can pick; the same rules are enforced again in the
 * action, because the list can go stale while the dialog is open.
 */
export async function getCreateClassOptions(): Promise<{
  students: CreateClassStudent[];
  teachers: CreateClassTeacher[];
}> {
  const [students, teachers] = await Promise.all([
    db.student.findMany({
      where: { status: { in: ELIGIBLE_STUDENT_STATUSES } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        languageId: true,
        primaryTeacherId: true,
        language: { select: { name: true } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    db.teacher.findMany({
      where: { active: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        languages: { select: { languageId: true } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);

  return {
    students: students.map((student) => ({
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      languageId: student.languageId,
      languageName: student.language.name,
      primaryTeacherId: student.primaryTeacherId,
    })),
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      name: `${teacher.firstName} ${teacher.lastName}`,
      languageIds: teacher.languages.map((entry) => entry.languageId),
    })),
  };
}

/** Sessions of the week starting on the given Monday, as the calendar renders them. */
export async function getWeekSessions(
  weekStart: string,
  teacherId?: string
): Promise<CalendarSession[]> {
  const start = zonedToUtc(weekStart, "00:00", DEFAULT_TIMEZONE);
  const end = zonedToUtc(addDaysToDate(weekStart, 7), "00:00", DEFAULT_TIMEZONE);

  const sessions = await findWeekSessions(start, end, teacherId);
  return sessions.map(toCalendarSession);
}
