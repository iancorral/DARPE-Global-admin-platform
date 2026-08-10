import { z } from "zod";

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

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

export const scheduleSlotSchema = z
  .object({
    studentId: z.string().min(1, "Select a student"),
    teacherId: z.string().min(1, "Select a teacher"),
    weekday: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format"),
    durationMinutes: z.coerce.number().int().min(15).max(240),
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