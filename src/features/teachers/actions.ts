"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import {
  teacherFormSchema,
  updateTeacherSchema,
  type TeacherFormInput,
  type UpdateTeacherInput,
} from "./schemas";

/**
 * Local, not exported: this module is a `"use server"` entrypoint, so its runtime
 * exports must be async Server Actions and nothing else.
 */
type ActionResult = { success: true } | { success: false; error: string };

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

/**
 * Saves the teacher's details, the languages they teach, and whether they are
 * active, as one transaction so the languages can never be half-replaced.
 *
 * Deactivating is deliberately just this flag. Classes the teacher already has
 * stay exactly as they are — the server-side eligibility and generation rules
 * are what stop an inactive teacher from being given new ones, so no client can
 * bypass that by other means.
 */
export async function updateTeacher(input: UpdateTeacherInput): Promise<ActionResult> {
  await requireUser();

  const parsed = updateTeacherSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the form and try again." };
  }

  const { id, languageIds, email, phone, ...rest } = parsed.data;

  try {
    await db.$transaction(async (tx) => {
      await tx.teacher.update({
        where: { id },
        data: { ...rest, email: email || null, phone: phone || null },
      });

      // Replaced wholesale: the junction rows carry nothing but the pairing, so
      // recreating them is simpler than diffing and loses no information.
      await tx.teacherLanguage.deleteMany({ where: { teacherId: id } });
      await tx.teacherLanguage.createMany({
        data: languageIds.map((languageId) => ({ teacherId: id, languageId })),
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return { success: false, error: "That teacher no longer exists." };
      }
      if (error.code === "P2002") {
        return { success: false, error: "Another teacher already uses that email." };
      }
      if (error.code === "P2003") {
        return { success: false, error: "Choose valid languages." };
      }
    }
    throw error;
  }

  revalidatePath("/teachers");
  revalidatePath("/calendar");
  return { success: true };
}