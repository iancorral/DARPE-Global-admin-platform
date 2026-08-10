import "server-only";
import { db } from "@/lib/db";

export async function getScheduleFormOptions() {
  const teachers = await db.teacher.findMany({
    where: { active: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  return { teachers };
}