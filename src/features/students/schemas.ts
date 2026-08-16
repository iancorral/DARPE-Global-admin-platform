import { z } from "zod";

export const MODALITIES = [
  "ADVISORY",
  "GROUP_EXTENSIVE",
  "INDIVIDUAL_EXTENSIVE",
  "INDIVIDUAL_INTENSIVE",
] as const;

export const STUDENT_STATUSES = ["TRIAL", "ACTIVE", "PAUSED", "ARCHIVED"] as const;

export const STUDENT_STATUS_LABELS: Record<(typeof STUDENT_STATUSES)[number], string> = {
  TRIAL: "Trial",
  ACTIVE: "Active",
  PAUSED: "Paused",
  ARCHIVED: "Archived",
};

export const studentFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  languageId: z.string().min(1, "Select a language"),
  primaryTeacherId: z.string().optional().or(z.literal("")),
  modality: z.enum(MODALITIES),
  status: z.enum(STUDENT_STATUSES),
  level: z.string().trim().max(30).optional().or(z.literal("")),
  goal: z.string().trim().max(300).optional().or(z.literal("")),
});

export type StudentFormInput = z.infer<typeof studentFormSchema>;

/** An edit is the same form the student was created with, aimed at one record. */
export const updateStudentSchema = studentFormSchema.extend({
  id: z.string().min(1),
});

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;