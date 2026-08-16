"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import {
  studentFormSchema,
  updateStudentSchema,
  type StudentFormInput,
  type UpdateStudentInput,
} from "./schemas";

/**
 * The new student's id comes back so the caller can carry on with them.
 *
 * That is what makes adding a student mid-scheduling a round trip: the calendar
 * reopens with this student selected instead of asking staff to find the person
 * they have just typed in.
 *
 * Local, not exported: this module is a `"use server"` entrypoint, so its runtime
 * exports must be async Server Actions and nothing else.
 */
type CreateStudentResult =
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

type UpdateStudentResult = { success: true } | { success: false; error: string };

/**
 * Saves every field the form carries, including status. Status has no transition
 * rules of its own — pausing, archiving and reactivating are all ordinary edits —
 * but leaving the eligible statuses is what stops new classes from being
 * scheduled: generation, the calendar and the profile CTA all re-check
 * eligibility on the server, so nothing here needs to cascade into sessions.
 */
export async function updateStudent(input: UpdateStudentInput): Promise<UpdateStudentResult> {
  await requireUser();

  const parsed = updateStudentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the form and try again." };
  }

  const { id, email, phone, level, goal, primaryTeacherId, ...rest } = parsed.data;

  try {
    await db.student.update({
      where: { id },
      data: {
        ...rest,
        email: email || null,
        phone: phone || null,
        level: level || null,
        goal: goal || null,
        primaryTeacherId: primaryTeacherId || null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: the student is gone. P2003: a submitted language or teacher id
      // does not exist — possible only from a stale or manipulated client.
      if (error.code === "P2025") {
        return { success: false, error: "That student no longer exists." };
      }
      if (error.code === "P2003") {
        return { success: false, error: "Choose a valid language and teacher." };
      }
    }
    throw error;
  }

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  revalidatePath("/calendar");
  return { success: true };
}