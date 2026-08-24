"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import {
  createLanguageSchema,
  teachingHoursSchema,
  updateLanguageSchema,
  type CreateLanguageInput,
  type TeachingHoursInput,
  type UpdateLanguageInput,
} from "./schemas";
import { ACADEMY_SETTINGS_ID } from "./constants";

/**
 * Local, not exported: this module is a `"use server"` entrypoint, so its
 * runtime exports must be async Server Actions and nothing else.
 */
type ActionResult = { success: true } | { success: false; error: string };

/** Every screen that offers a language reads from the same table. */
function revalidateLanguageScreens() {
  revalidatePath("/settings");
  revalidatePath("/students");
  revalidatePath("/teachers");
  revalidatePath("/calendar");
}

export async function createLanguage(input: CreateLanguageInput): Promise<ActionResult> {
  await requireUser();

  const parsed = createLanguageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
    };
  }

  try {
    await db.language.create({ data: parsed.data });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Both name and code are unique; say which one collided.
      const target = String(error.meta?.target ?? "");
      return {
        success: false,
        error: target.includes("code")
          ? "That code is already used by another language."
          : "A language with that name already exists.",
      };
    }
    throw error;
  }

  revalidateLanguageScreens();
  return { success: true };
}

/**
 * Renames a language or switches it on and off.
 *
 * Deactivating never deletes and never touches existing records: students keep
 * their language, past classes keep theirs, and the teachers who taught it keep
 * the association. It only removes the language from the forms that offer a
 * choice, so nothing new is created in a language the academy has stopped
 * teaching. Reactivating puts it straight back.
 */
export async function updateLanguage(input: UpdateLanguageInput): Promise<ActionResult> {
  await requireUser();

  const parsed = updateLanguageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
    };
  }

  const { id, name, active } = parsed.data;

  try {
    await db.language.update({ where: { id }, data: { name, active } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return { success: false, error: "That language no longer exists." };
      }
      if (error.code === "P2002") {
        return { success: false, error: "A language with that name already exists." };
      }
    }
    throw error;
  }

  revalidateLanguageScreens();
  return { success: true };
}

/**
 * Saves the academy's teaching day.
 *
 * Upserted rather than updated: the row does not exist until somebody saves for
 * the first time, and the application runs on defaults until then.
 *
 * These hours change what the calendar *marks*, never what it *allows* — a
 * class outside them stays bookable, because students in other countries make
 * an early or late class ordinary. Existing classes are untouched.
 */
export async function updateTeachingHours(
  input: TeachingHoursInput
): Promise<ActionResult> {
  await requireUser();

  const parsed = teachingHoursSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check the hours and try again.",
    };
  }

  const { dayStartHour, dayEndHour } = parsed.data;

  try {
    await db.academySettings.upsert({
      where: { id: ACADEMY_SETTINGS_ID },
      update: { dayStartHour, dayEndHour },
      create: { id: ACADEMY_SETTINGS_ID, dayStartHour, dayEndHour },
    });
  } catch (error) {
    // P2021: the settings table has not been created on this database yet.
    // Reading falls back to defaults silently, but a save that cannot be kept
    // has to say so rather than pretend it worked.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      return {
        success: false,
        error: "Settings storage is not ready on this database yet.",
      };
    }
    throw error;
  }

  revalidatePath("/settings");
  revalidatePath("/calendar");
  return { success: true };
}
