import { z } from "zod";
import { alignedStartTimeSchema, offeredDurationSchema } from "@/features/sessions/schemas";
import { addDaysToDate, isCalendarDate } from "@/lib/datetime";
import { MAX_SERIES_SPAN_DAYS, MAX_SERIES_WEEKS } from "./series";

export const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
] as const;

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

const dateOnly = z.string("Choose a date").regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

/**
 * A date that exists, not just one shaped like a date. Series ranges are counted
 * and added to, and "2026-02-31" would take that arithmetic somewhere invalid.
 */
const realDateOnly = dateOnly.refine(isCalendarDate, "Choose a date that exists");

export const scheduleSlotSchema = z
  .object({
    studentId: z.string("Select a student").min(1, "Select a student"),
    teacherId: z.string("Select a teacher").min(1, "Select a teacher"),
    weekday: z.coerce
      .number("Select a day")
      .int("Select a day")
      .min(0, "Select a day")
      .max(6, "Select a day"),
    startTime: alignedStartTimeSchema,
    durationMinutes: z.coerce
      .number("Enter a duration in minutes")
      .int("Enter a whole number of minutes")
      .min(15, "A class must be at least 15 minutes")
      .max(240, "A class cannot be longer than 4 hours"),
    startsOn: dateOnly,
    endsOn: z.union([dateOnly, z.literal("")]).optional(),
  })
  .refine((slot) => !slot.endsOn || slot.endsOn >= slot.startsOn, {
    message: "The end date cannot be before the start date",
    path: ["endsOn"],
  });

export type ScheduleSlotInput = z.infer<typeof scheduleSlotSchema>;

/**
 * A weekly series created from a calendar position.
 *
 * Deliberately stricter than `scheduleSlotSchema`, which still has to accept the
 * recurring slots the product created before this flow existed. A new series has
 * an end date — there is no "never ends" from the calendar — starts on the hour or
 * half hour like every other new class, and uses a duration the form offers.
 *
 * What is absent matters as much as what is here. There is no weekday, no
 * language and no list of occurrences: the weekday follows from `startsOn`, the
 * language from the student, and the occurrences from the range. A client that
 * sends them is simply ignored, so a series can never claim to repeat on a day it
 * does not, or in a language the student does not study.
 */
export const weeklySeriesSchema = z
  .object({
    studentId: z.string("Select a student").min(1, "Select a student"),
    teacherId: z.string("Select a teacher").min(1, "Select a teacher"),
    startsOn: realDateOnly,
    endsOn: realDateOnly,
    startTime: alignedStartTimeSchema,
    durationMinutes: offeredDurationSchema,
  })
  .refine((series) => series.endsOn >= series.startsOn, {
    message: "The last class cannot be before the first one",
    path: ["endsOn"],
  })
  .refine(
    (series) => series.endsOn <= addDaysToDate(series.startsOn, MAX_SERIES_SPAN_DAYS),
    {
      message: `A weekly series can run for at most ${MAX_SERIES_WEEKS} weeks. Choose an earlier end date.`,
      path: ["endsOn"],
    }
  );

export type WeeklySeriesInput = z.infer<typeof weeklySeriesSchema>;

export const generateMonthSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export type GenerateMonthInput = z.infer<typeof generateMonthSchema>;