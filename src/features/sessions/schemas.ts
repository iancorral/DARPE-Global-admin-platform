import { z } from "zod";

export const DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;

export const calendarParamsSchema = z.object({
  week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  teacher: z.string().min(1).optional(),
});

export const rescheduleSessionSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format"),
  durationMinutes: z.coerce.number().int().min(15).max(240),
});

export type RescheduleSessionInput = z.infer<typeof rescheduleSessionSchema>;

/**
 * Completing a class is not part of this schema: it carries attendance with it,
 * so it goes through completeSessionSchema instead.
 */
export const sessionStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["SCHEDULED", "CANCELLED"]),
});

export type SessionStatusInput = z.infer<typeof sessionStatusSchema>;

export const attendanceValueSchema = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

export type AttendanceValue = z.infer<typeof attendanceValueSchema>;

export const ATTENDANCE_OPTIONS: { value: AttendanceValue; label: string }[] = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
  { value: "EXCUSED", label: "Excused" },
];

/**
 * Marks a class completed and records who attended, in one step. Participants
 * left out of the list keep the attendance they already had.
 */
export const completeSessionSchema = z.object({
  id: z.string().min(1),
  attendance: z
    .array(
      z.object({
        participantId: z.string().min(1),
        value: attendanceValueSchema,
      })
    )
    .max(50),
});

export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;
