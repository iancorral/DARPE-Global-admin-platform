"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { teacherFormSchema, type TeacherFormInput } from "./schemas";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createTeacher(input: TeacherFormInput): Promise<ActionResult> {
  await requireUser();

  const parsed = teacherFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the form and try again." };
  }

  const { languageIds, email, phone, ...rest } = parsed.data;

  try {
    await db.teacher.create({
      data: {
        ...rest,
        email: email || null,
        phone: phone || null,
        languages: {
          create: languageIds.map((languageId) => ({ languageId })),
        },
      },
    });
  } catch {
    return { success: false, error: "Could not create the teacher. The email may already exist." };
  }

  revalidatePath("/teachers");
  return { success: true };
}