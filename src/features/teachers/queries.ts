import "server-only";
import { db } from "@/lib/db";

export async function getTeachers() {
  return db.teacher.findMany({
    where: { active: true },
    include: {
      languages: { include: { language: true } },
      _count: { select: { primaryStudents: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}

export async function getLanguageOptions() {
  return db.language.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}