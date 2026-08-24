import { z } from "zod";

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
