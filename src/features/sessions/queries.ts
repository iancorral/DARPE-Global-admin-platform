import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_TIMEZONE, addDaysToDate, formatInZone, zonedToUtc } from "@/lib/datetime";
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
