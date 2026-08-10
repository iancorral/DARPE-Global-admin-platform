import "server-only";
import { db } from "@/lib/db";
import type { StudentStatus } from "@/generated/prisma/client";

export async function getStudents(filters?: { status?: StudentStatus; search?: string }) {
  return db.student.findMany({
    where: {
      status: filters?.status ?? { not: "ARCHIVED" },
      ...(filters?.search && {
        OR: [
          { firstName: { contains: filters.search, mode: "insensitive" } },
          { lastName: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      language: { select: { id: true, name: true } },
      primaryTeacher: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
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