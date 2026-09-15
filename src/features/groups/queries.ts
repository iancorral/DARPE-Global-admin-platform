import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_TIMEZONE, formatInZone, startOfWeekDate } from "@/lib/datetime";
import { ELIGIBLE_STUDENT_STATUSES } from "@/features/sessions/eligibility";
import type { ClassStatus, StudentStatus } from "@/generated/prisma/client";
import { fullName } from "@/lib/names";

export type GroupListRow = {
  id: string;
  name: string;
  active: boolean;
  teacherName: string;
  /// False when the group's teacher has left. The group generates nothing in
  /// that state, so the list has to say so rather than looking healthy.
  teacherActive: boolean;
  languageName: string;
  memberCount: number;
  slotCount: number;
};

/** Every group, active or not — this list is the only way back to a closed one. */
export async function getGroupRows(): Promise<GroupListRow[]> {
  const groups = await db.group.findMany({
    select: {
      id: true,
      name: true,
      active: true,
      teacher: { select: { firstName: true, lastName: true, active: true } },
      language: { select: { name: true } },
      _count: { select: { members: true } },
      scheduleSlots: { where: { active: true }, select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    active: group.active,
    teacherName: fullName(group.teacher),
    teacherActive: group.teacher.active,
    languageName: group.language.name,
    memberCount: group._count.members,
    slotCount: group.scheduleSlots.length,
  }));
}

export type GroupMemberRow = {
  studentId: string;
  name: string;
  status: StudentStatus;
  level: string | null;
};

export type GroupSlotRow = {
  id: string;
  weekday: number;
  startTime: string;
  durationMinutes: number;
  startsOn: Date;
  endsOn: Date | null;
};

export type GroupUpcomingSession = {
  id: string;
  dateLabel: string;
  startLabel: string;
  durationMinutes: number;
  status: ClassStatus;
  participantCount: number;
  weekHref: string;
};

export type GroupDetail = {
  id: string;
  name: string;
  active: boolean;
  notes: string | null;
  teacherId: string;
  teacherName: string;
  teacherActive: boolean;
  languageId: string;
  languageName: string;
  members: GroupMemberRow[];
  slots: GroupSlotRow[];
  upcoming: GroupUpcomingSession[];
  /**
   * Students who could still be added: they study this group's language, are
   * active or on trial, and are not already members. The same rules are checked
   * again in the action, because this list goes stale while the page is open.
   */
  candidates: { id: string; name: string; level: string | null }[];
};

export async function getGroupDetail(
  id: string,
  now: Date = new Date()
): Promise<GroupDetail | null> {
  const group = await db.group.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      active: true,
      notes: true,
      teacherId: true,
      languageId: true,
      teacher: { select: { firstName: true, lastName: true, active: true } },
      language: { select: { name: true } },
      members: {
        select: {
          student: {
            select: { id: true, firstName: true, lastName: true, status: true, level: true },
          },
        },
        orderBy: { student: { firstName: "asc" } },
      },
      scheduleSlots: {
        where: { active: true },
        select: {
          id: true,
          weekday: true,
          startTime: true,
          durationMinutes: true,
          startsOn: true,
          endsOn: true,
        },
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!group) return null;

  const memberIds = group.members.map((member) => member.student.id);

  const [upcoming, candidates] = await Promise.all([
    db.classSession.findMany({
      where: { groupId: id, startsAt: { gte: now } },
      select: {
        id: true,
        startsAt: true,
        durationMinutes: true,
        status: true,
        _count: { select: { participants: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
    db.student.findMany({
      where: {
        languageId: group.languageId,
        status: { in: ELIGIBLE_STUDENT_STATUSES },
        id: { notIn: memberIds.length > 0 ? memberIds : ["__none__"] },
      },
      select: { id: true, firstName: true, lastName: true, level: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);

  return {
    id: group.id,
    name: group.name,
    active: group.active,
    notes: group.notes,
    teacherId: group.teacherId,
    teacherName: fullName(group.teacher),
    teacherActive: group.teacher.active,
    languageId: group.languageId,
    languageName: group.language.name,
    members: group.members.map((member) => ({
      studentId: member.student.id,
      name: fullName(member.student),
      status: member.student.status,
      level: member.student.level,
    })),
    slots: group.scheduleSlots,
    upcoming: upcoming.map((session) => {
      const date = formatInZone(session.startsAt, DEFAULT_TIMEZONE, "yyyy-MM-dd");

      return {
        id: session.id,
        dateLabel: formatInZone(session.startsAt, DEFAULT_TIMEZONE, "EEE, MMM d"),
        startLabel: formatInZone(session.startsAt, DEFAULT_TIMEZONE),
        durationMinutes: session.durationMinutes,
        status: session.status,
        participantCount: session._count.participants,
        weekHref: `/calendar?week=${startOfWeekDate(date)}`,
      };
    }),
    candidates: candidates.map((student) => ({
      id: student.id,
      name: fullName(student),
      level: student.level,
    })),
  };
}

/** Teachers and languages a group can be created with. */
export async function getGroupFormOptions() {
  const [teachers, languages] = await Promise.all([
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
    db.language.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      name: fullName(teacher),
      languageIds: teacher.languages.map((entry) => entry.languageId),
    })),
    languages,
  };
}
