"use server";

import { revalidatePath } from "next/cache";
import { pausedAtForChange } from "./pause";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import {
  quickEditSchema,
  studentFormSchema,
  type QuickEditInput,
  type StudentFormInput,
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
        pausedAt: rest.status === "PAUSED" ? new Date() : null,
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

type QuickEditResult = { success: true } | { success: false; error: string };

/**
 * Changes one field straight from the list.
 *
 * Everything staff do most often — marking a course paid, pausing somebody,
 * setting a level — was four navigations away through the edit form. This is
 * the same write with the same server-side validation, aimed at one column.
 *
 * Pausing still goes through `pausedAtForChange`, so a pause started here is
 * dated exactly as one started from the form: there is no second rule.
 */
export async function quickEditStudent(input: QuickEditInput): Promise<QuickEditResult> {
  await requireUser();

  const parsed = quickEditSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "That value is not valid." };

  const { id, field, value } = parsed.data;

  try {
    if (field === "status") {
      const current = await db.student.findUnique({ where: { id }, select: { status: true } });
      if (!current) return { success: false, error: "That student no longer exists." };

      const pausedAt = pausedAtForChange(current.status, value, new Date());

      await db.student.update({
        where: { id },
        data: { status: value, ...(pausedAt === undefined ? {} : { pausedAt }) },
      });
    } else if (field === "billing") {
      await db.student.update({ where: { id }, data: { billing: value } });
    } else if (field === "firstName" || field === "modality" || field === "languageId") {
      // Required columns: an empty value was already refused by the schema.
      await db.student.update({ where: { id }, data: { [field]: value } });
    } else {
      // Every remaining field is nullable text or a nullable enum, and empty
      // always means "not set" rather than an empty string in the column.
      await db.student.update({
        where: { id },
        data: { [field]: value || null },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return { success: false, error: "That student no longer exists." };
      }
      // P2003: a submitted language or teacher id does not exist — only
      // possible from a stale or tampered-with client.
      if (error.code === "P2003") {
        return { success: false, error: "Choose a valid language and teacher." };
      }
    }
    throw error;
  }

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  revalidatePath("/payments");
  revalidatePath("/calendar");
  return { success: true };
}
