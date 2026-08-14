import { z } from "zod";
import { alignedStartTimeSchema } from "@/features/sessions/schemas";

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

export const generateMonthSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export type GenerateMonthInput = z.infer<typeof generateMonthSchema>;