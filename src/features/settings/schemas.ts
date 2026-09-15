import { z } from "zod";
import { parseAmountToCents } from "@/features/finance/money";
import { MODALITIES } from "@/features/students/schemas";

/**
 * A language the academy offers.
 *
 * The code is the stable identity: it is what `languageTone` matches on for
 * colour, and what `prisma/seed.ts` upserts by, so renaming a language keeps
 * everything else pointing at it. Two to five lowercase letters, matching the
 * ISO-ish codes already stored (`es en fr it de ja sv`).
 */
export const languageCodeSchema = z
  .string("Enter a language code")
  .trim()
  .toLowerCase()
  .min(2, "Use at least two letters")
  .max(5, "Use at most five letters")
  .regex(/^[a-z]+$/, "Letters only — no spaces, digits or punctuation");

export const createLanguageSchema = z.object({
  name: z
    .string("Enter a name")
    .trim()
    .min(2, "Enter a name")
    .max(40, "That name is too long"),
  code: languageCodeSchema,
});

export type CreateLanguageInput = z.infer<typeof createLanguageSchema>;

/**
 * An edit never touches the code. Changing it would silently detach the
 * language from its colour and from what the seed upserts, so the code is set
 * once when the language is created.
 */
export const updateLanguageSchema = z.object({
  id: z.string().min(1),
  name: z
    .string("Enter a name")
    .trim()
    .min(2, "Enter a name")
    .max(40, "That name is too long"),
  active: z.boolean(),
});

export type UpdateLanguageInput = z.infer<typeof updateLanguageSchema>;

/**
 * The academy's teaching day.
 *
 * Whole hours only: the calendar's rows are hours, and a working day starting
 * at 08:20 would mark half a row. `dayEndHour` is exclusive — the first hour
 * that is no longer the teaching day — so 08:00–20:00 means the last class
 * inside normal hours may start at 19:30.
 *
 * A day must contain at least one hour, and the check lives here rather than
 * in the action so it holds for anything that ever writes these values.
 */
export const teachingHoursSchema = z
  .object({
    dayStartHour: z.coerce
      .number("Choose a start hour")
      .int("Choose a whole hour")
      .min(0, "The earliest start is 00:00")
      .max(23, "The latest start is 23:00"),
    dayEndHour: z.coerce
      .number("Choose an end hour")
      .int("Choose a whole hour")
      .min(1, "The earliest end is 01:00")
      .max(24, "The latest end is 24:00"),
  })
  .refine((hours) => hours.dayStartHour < hours.dayEndHour, {
    message: "The day has to end after it starts.",
    path: ["dayEndHour"],
  });

export type TeachingHoursInput = z.infer<typeof teachingHoursSchema>;

/**
 * One list price, as typed.
 *
 * Amounts arrive as the text staff typed — "2999" or "2,999.00" — and become
 * integer cents through the same parser every other money field uses, so a
 * price can never pick up a floating-point peso. Zero is refused: a course
 * that costs nothing is not a price, it is a billing state (BENEFIT), and that
 * lives on the student.
 */
const priceAmountSchema = z
  .string("Enter an amount")
  .trim()
  .min(1, "Enter an amount")
  .transform((value, ctx) => {
    const cents = parseAmountToCents(value);

    if (cents === null || cents <= 0) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 2999 or 2999.50" });
      return z.NEVER;
    }

    return cents;
  });

export const updateCoursePriceSchema = z.object({
  modality: z.enum(MODALITIES),
  mxn: priceAmountSchema,
  usd: priceAmountSchema,
});

export type UpdateCoursePriceInput = z.input<typeof updateCoursePriceSchema>;
