"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { teacherFormSchema, type TeacherFormInput } from "./schemas";

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
const quickEditTeacherSchema = z.discriminatedUnion("field", [
  z.object({
    id: z.string().min(1),
    field: z.literal("firstName"),
    value: z.string().trim().min(1, "A first name is required").max(60),
  }),
  z.object({
    id: z.string().min(1),
    field: z.literal("lastName"),
    value: z.string().trim().max(60),
  }),
  z.object({
    id: z.string().min(1),
    field: z.literal("email"),
    value: z.string().trim().email("Enter a valid email").or(z.literal("")),
  }),
  z.object({
    id: z.string().min(1),
    field: z.literal("phone"),
    value: z.string().trim().max(30),
  }),
  z.object({
    id: z.string().min(1),
    field: z.literal("notes"),
    value: z.string().trim().max(500),
  }),
  z.object({ id: z.string().min(1), field: z.literal("active"), value: z.boolean() }),
  z.object({
    id: z.string().min(1),
    field: z.literal("languageIds"),
    value: z.array(z.string().min(1)).min(1, "Pick at least one language"),
  }),
]);

/**
 * Changes one field on a teacher, straight from their profile.
 *
 * The same server-side validation the form applies, aimed at one column — see
 * `quickEditStudent` for why the product has no edit pages.
 *
 * Languages replace the whole set in one transaction: a teacher's languages are
 * a set, not a list of rows to add and remove one at a time, and a half-applied
 * change would leave them teaching something they do not.
 */
export async function quickEditTeacher(
  input: z.infer<typeof quickEditTeacherSchema>
): Promise<ActionResult> {
  await requireUser();

  const parsed = quickEditTeacherSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "That value is not valid." };
  }

  const { id, field, value } = parsed.data;

  try {
    if (field === "languageIds") {
      await db.$transaction([
        db.teacherLanguage.deleteMany({ where: { teacherId: id } }),
        db.teacherLanguage.createMany({
          data: value.map((languageId) => ({ teacherId: id, languageId })),
        }),
      ]);
    } else if (field === "firstName" || field === "active") {
      await db.teacher.update({ where: { id }, data: { [field]: value } });
    } else {
      await db.teacher.update({ where: { id }, data: { [field]: value || null } });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return { success: false, error: "That teacher no longer exists." };
      }
      if (error.code === "P2002") {
        return { success: false, error: "Another teacher already uses that email." };
      }
      if (error.code === "P2003") {
        return { success: false, error: "Choose a valid language." };
      }
    }
    throw error;
  }

  revalidatePath("/teachers");
  revalidatePath(`/teachers/${id}`);
  revalidatePath("/calendar");
  return { success: true };
}
