import { z } from "zod";
import { isAlignedStartTime } from "./scheduling";

export const DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;

export const ALIGNED_START_MESSAGE = `Classes start on the hour or half hour. Choose a time ending in :00 or :30.`;

/**
 * The alignment rule as a schema fragment, for records being created.
 *
 * Kept out of `updateSessionSchedulingSchema` on purpose: whether an edit's start
 * time is allowed depends on the time the class already has, which a static schema
 * cannot see. That case is decided in the server action against the stored record.
 */
export const alignedStartTimeSchema = z
  .string("Choose a start time")
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format")
  .refine(isAlignedStartTime, ALIGNED_START_MESSAGE);

/**
 * A duration the calendar actually offers, for records being created there.
 *
 * Shared by a single class and by a weekly series so both accept exactly the same
 * lengths. Existing records are deliberately not held to it — see the wider bounds
 * on `updateSessionSchedulingSchema`.
 */
export const offeredDurationSchema = z.coerce
  .number("Choose one of the offered durations")
  .int("Choose one of the offered durations")
  .refine(
    (value) => (DURATION_OPTIONS as readonly number[]).includes(value),
    "Choose one of the offered durations"
  );

/**
 * The first validation message, for actions that surface why input was rejected.
 *
 * Safe to show, but only because every field of the schemas used with it carries
 * its own message for a missing value as well as an invalid one. Add a field
 * without one and Zod's default — which describes the shape of the data rather
 * than what the user did — would reach the screen. `schemas.test.ts` guards this.
 */
export function firstValidationMessage(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}

/**
 * The calendar's own URL surface.
 *
 * `week`, `teacher` and `moving` are the calendar's state. `date`, `time`, `mode`
 * and `student` are the create-class dialog's, and exist so that leaving the
 * calendar to add a student can come back to exactly the position it left from.
 *
 * The creation params are only accepted as strings here and given their meaning by
 * `calendarCreateIntent`, which validates each one on its own. That way one
 * malformed value degrades into browsing that week rather than throwing away the
 * week and the teacher filter with it.
 */
export const calendarParamsSchema = z.object({
  week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  teacher: z.string().min(1).optional(),
  moving: z.string().min(1).optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  mode: z.string().optional(),
  student: z.string().optional(),
  duration: z.string().optional(),
  until: z.string().optional(),
});

/**
 * A change to when a class happens and who teaches it.
 *
 * Teacher, time and duration travel together so the server validates the state the
 * class would end up in, rather than approving each field against the old values.
 *
 * The duration bounds stay deliberately wider than the durations the form offers:
 * sessions generated from older recurring slots can have other lengths, and moving
 * one must not be blocked just because its length is no longer on the menu.
 */
export const updateSessionSchedulingSchema = z.object({
  id: z.string().min(1),
  teacherId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format"),
  durationMinutes: z.coerce.number().int().min(15).max(240),
});

export type UpdateSessionSchedulingInput = z.infer<typeof updateSessionSchedulingSchema>;

/**
 * A one-off class created by hand, outside any recurring schedule.
 *
 * The language is deliberately absent: it is derived from the student on the
 * server, so the form cannot submit a class in a language the student does not study.
 */
export const createSessionSchema = z.object({
  studentId: z.string("Select a student").min(1, "Select a student"),
  teacherId: z.string("Select a teacher").min(1, "Select a teacher"),
  date: z.string("Choose a date").regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  startTime: alignedStartTimeSchema,
  durationMinutes: z.coerce
    .number("Choose one of the offered durations")
    .int("Choose one of the offered durations")
    .refine(
      (value) => (DURATION_OPTIONS as readonly number[]).includes(value),
      "Choose one of the offered durations"
    ),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

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
