"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { studentFormSchema, type StudentFormInput } from "./schemas";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createStudent(input: StudentFormInput): Promise<ActionResult> {
  await requireUser();

  const parsed = studentFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the form and try again." };
  }

  const { email, phone, level, goal, primaryTeacherId, ...rest } = parsed.data;

  try {
    await db.student.create({
      data: {
        ...rest,
        email: email || null,
        phone: phone || null,
        level: level || null,
        goal: goal || null,
        primaryTeacherId: primaryTeacherId || null,
        startedAt: new Date(),
      },
    });
  } catch {
    return { success: false, error: "Could not create the student." };
  }

  revalidatePath("/students");
  return { success: true };
}