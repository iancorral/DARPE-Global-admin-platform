import "server-only";
import { db } from "@/lib/db";
import { fullName } from "@/lib/names";
import { STUDENT_STATUS_LABELS } from "@/features/students/schemas";
import type { DirectoryEntry } from "./similar";

/*
 * What each create form checks a new name against. Newest first, because with
 * nothing typed yet the panel shows the most recently added records, which is
 * also the likeliest place for a duplicate to have just been made.
 *
 * Archived and inactive records are included on purpose: re-adding somebody who
 * left is exactly the duplicate worth catching, and the detail line says so.
 */

export async function getStudentDirectory(): Promise<DirectoryEntry[]> {
  const students = await db.student.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      language: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return students.map((student) => ({
    id: student.id,
    name: fullName(student),
    href: `/students/${student.id}`,
    detail: `${student.language.name} · ${STUDENT_STATUS_LABELS[student.status]}`,
  }));
}

export async function getTeacherDirectory(): Promise<DirectoryEntry[]> {
  const teachers = await db.teacher.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      active: true,
      languages: { select: { language: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return teachers.map((teacher) => {
    const languages = teacher.languages.map((entry) => entry.language.name).join(", ");

    return {
      id: teacher.id,
      name: fullName(teacher),
      href: `/teachers/${teacher.id}`,
      detail: [languages || "No languages", teacher.active ? null : "Archived"]
        .filter(Boolean)
        .join(" · "),
    };
  });
}

export async function getGroupDirectory(): Promise<DirectoryEntry[]> {
  const groups = await db.group.findMany({
    select: {
      id: true,
      name: true,
      active: true,
      language: { select: { name: true } },
      teacher: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    href: `/groups/${group.id}`,
    detail: [group.language.name, fullName(group.teacher), group.active ? null : "Closed"]
      .filter(Boolean)
      .join(" · "),
  }));
}
