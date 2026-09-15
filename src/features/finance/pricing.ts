import type { Currency, Modality } from "@/generated/prisma/client";

/**
 * DARPE's published course prices, as of 2026-08.
 *
 * A course is one month — four weeks — with material included. What a student
 * owes is **inferred from their modality**, not typed in per person: if they
 * are on individual extensive, that is the price of their course. That is why
 * this file exists at all.
 *
 * Read this as a price list, not as a bill:
 *
 * - DARPE knows of a discrepancy between this table and the one in their own
 *   register, and prices are under review for next year.
 * - Several students are on the price they started at, because Dhanna honours
 *   the original rate. This list cannot know that, so the payments screen calls
 *   what it shows the *list price* and never an amount owed.
 *
 * When DARPE settles the prices, this is the only file that changes.
 */
export type CoursePrice = {
  /** What staff call it. */
  label: string;
  /** Hours in the month the price buys. Advisory is priced per hour instead. */
  hoursPerMonth: number | null;
  mxnCents: number;
  usdCents: number;
  /** True when the figure is an hourly rate rather than a monthly course. */
  perHour: boolean;
};

export const COURSE_PRICES: Record<Modality, CoursePrice> = {
  ADVISORY: {
    label: "Advisory",
    hoursPerMonth: null,
    mxnCents: 37_000,
    usdCents: 2_500,
    perHour: true,
  },
  GROUP_EXTENSIVE: {
    label: "Group extensive",
    hoursPerMonth: 8,
    mxnCents: 135_000,
    usdCents: 7_000,
    perHour: false,
  },
  INDIVIDUAL_EXTENSIVE: {
    label: "Individual extensive",
    hoursPerMonth: 8,
    // $2,999 since 2026-09: the price new students are being charged. Students
    // who started at $2,800 keep it — Dhanna honours the original rate.
    mxnCents: 299_900,
    usdCents: 18_000,
    perHour: false,
  },
  INDIVIDUAL_INTENSIVE: {
    label: "Individual intensive",
    hoursPerMonth: 16,
    mxnCents: 530_000,
    usdCents: 38_000,
    perHour: false,
  },
};

/**
 * What a teacher is paid for finishing a course.
 *
 * Per course, not per hour: DARPE's own hourly figures are a pricing exercise,
 * not how anyone is actually paid. Group work pays one fee whatever the number
 * of students in it.
 */
export const TEACHER_COURSE_PAY_CENTS: Record<Modality, number | null> = {
  // Advisory pay has not been confirmed. Null rather than a guess.
  ADVISORY: null,
  GROUP_EXTENSIVE: 136_000,
  INDIVIDUAL_EXTENSIVE: 160_000,
  INDIVIDUAL_INTENSIVE: 320_000,
};

/** The two figures staff can change about a course. */
export type PriceOverride = { modality: Modality; mxnCents: number; usdCents: number };

/**
 * The published table with staff's edits laid over it.
 *
 * Settings stores only the prices somebody has changed, so a modality with no
 * row keeps its published figure. Labels and hours never change from Settings:
 * a course's shape is a business decision, its price is a yearly review.
 */
export function resolveCoursePrices(overrides: PriceOverride[]): Record<Modality, CoursePrice> {
  const resolved = { ...COURSE_PRICES };

  for (const override of overrides) {
    resolved[override.modality] = {
      ...COURSE_PRICES[override.modality],
      mxnCents: override.mxnCents,
      usdCents: override.usdCents,
    };
  }

  return resolved;
}

/** The list price of a student's course in one currency. */
export function coursePriceCents(
  modality: Modality,
  currency: Currency,
  prices: Record<Modality, CoursePrice> = COURSE_PRICES
): number {
  const price = prices[modality];

  return currency === "USD" ? price.usdCents : price.mxnCents;
}

/** "8 classes / month", or "Per hour" for an advisory. */
export function planLabel(modality: Modality): string {
  const price = COURSE_PRICES[modality];

  return price.hoursPerMonth === null
    ? "Per hour"
    : `${price.hoursPerMonth} classes / month`;
}
