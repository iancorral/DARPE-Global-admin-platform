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

export const sessionStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["SCHEDULED", "CANCELLED"]),
});

export type SessionStatusInput = z.infer<typeof sessionStatusSchema>;
