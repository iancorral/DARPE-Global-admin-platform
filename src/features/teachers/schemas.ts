import { z } from "zod";

export const teacherFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  // Optional: DARPE's register holds many teachers by first name alone.
  lastName: z.string().trim().max(60).optional().or(z.literal("")),
  email: z.string().trim().pipe(z.email("Enter a valid email")).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  languageIds: z.array(z.string()).min(1, "Select at least one language"),
});

export type TeacherFormInput = z.infer<typeof teacherFormSchema>;
