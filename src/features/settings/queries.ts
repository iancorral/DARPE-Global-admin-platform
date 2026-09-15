import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  DEFAULT_BUSINESS_HOURS,
  type BusinessHours,
} from "@/features/sessions/business-hours";
import { ACADEMY_SETTINGS_ID } from "./constants";
import {
  COURSE_PRICES,
  resolveCoursePrices,
  type CoursePrice,
} from "@/features/finance/pricing";
import type { Modality } from "@/generated/prisma/client";

export type LanguageRow = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  studentCount: number;
  teacherCount: number;
};

/**
 * Every language, with how much of the academy depends on it.
 *
 * The counts are what make deactivating a language a considered decision
 * rather than a guess: a language nobody studies can be switched off freely,
 * one with students behind it should not be.
 *
 * Inactive languages are listed too — this is the only screen that can bring
 * one back.
 */
export async function getLanguageRows(): Promise<LanguageRow[]> {
  const languages = await db.language.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      active: true,
      _count: { select: { students: true, teachers: true } },
    },
    orderBy: { name: "asc" },
  });

  return languages.map((language) => ({
    id: language.id,
    name: language.name,
    code: language.code,
    active: language.active,
    studentCount: language._count.students,
    teacherCount: language._count.teachers,
  }));
}

/**
 * The academy's teaching day, or the defaults if it has never been set.
 *
 * Never throws and never returns nothing: a fresh database has no settings row,
 * and the calendar still has to render. The row is created the first time
 * somebody saves, not before.
 */
export async function getTeachingHours(): Promise<BusinessHours> {
  let settings: { dayStartHour: number; dayEndHour: number } | null = null;

  try {
    settings = await db.academySettings.findUnique({
      where: { id: ACADEMY_SETTINGS_ID },
      select: { dayStartHour: true, dayEndHour: true },
    });
  } catch (error) {
    /*
     * P2021 — the table is not there yet, because the migration adding it has
     * not run on this database. Only that one code is swallowed, and only into
     * the defaults the product used before the setting existed: the calendar
     * has to render either way, and code that ships ahead of its migration
     * should degrade rather than break. Anything else is a real fault and is
     * rethrown untouched.
     */
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2021"
    ) {
      throw error;
    }
  }

  if (!settings) return DEFAULT_BUSINESS_HOURS;

  return {
    startHour: settings.dayStartHour,
    endHour: settings.dayEndHour,
  };
}

/**
 * The current list price of every course.
 *
 * Staff's edits from Settings laid over the published table; a modality nobody
 * has touched keeps its published figure. Degrades to the published table on
 * P2021 for the same reason `getTeachingHours` does — the payments screen has
 * to render on a database that has not run the migration yet.
 */
export async function getCoursePrices(): Promise<Record<Modality, CoursePrice>> {
  try {
    const overrides = await db.coursePrice.findMany({
      select: { modality: true, mxnCents: true, usdCents: true },
    });

    return resolveCoursePrices(overrides);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      return COURSE_PRICES;
    }
    throw error;
  }
}
