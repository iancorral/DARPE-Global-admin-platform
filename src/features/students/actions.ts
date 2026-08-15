"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { studentFormSchema, type StudentFormInput } from "./schemas";

export type ActionResult = { success: true } | { success: false; error: string };

/**
 * The new student's id comes back so the caller can carry on with them.
 *
 * That is what makes adding a student mid-scheduling a round trip: the calendar
 * reopens with this student selected instead of asking staff to find the person
 * they have just typed in.
 */
export type CreateStudentResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createStudent(
  input: StudentFormInput
): Promise<CreateStudentResult> {
  await requireUser();

  const parsed = studentFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the form and try again." };
  }

  const { email, phone, level, goal, primaryTeacherId, ...rest } = parsed.data;

  let student;
  try {
    student = await db.student.create({
      data: {
        ...rest,
        email: email || null,
        phone: phone || null,
        level: level || null,
        goal: goal || null,
        primaryTeacherId: primaryTeacherId || null,
        startedAt: new Date(),
      },
      select: { id: true },
    });
  } catch {
    return { success: false, error: "Could not create the student." };
  }

  revalidatePath("/students");
  return { success: true, id: student.id };
}