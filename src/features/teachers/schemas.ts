import { z } from "zod";

export const teacherFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().trim().pipe(z.email("Enter a valid email")).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  languageIds: z.array(z.string()).min(1, "Select at least one language"),
});

export type TeacherFormInput = z.infer<typeof teacherFormSchema>;

/**
 * An edit carries the active flag as well: deactivating a teacher is an ordinary
 * edit, not a separate lifecycle action. What it means is decided elsewhere —
 * eligibility and generation already refuse inactive teachers on the server.
 */
export const updateTeacherSchema = teacherFormSchema.extend({
  id: z.string().min(1),
  active: z.boolean(),
});

export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;