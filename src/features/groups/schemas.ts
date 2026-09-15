import { z } from "zod";

/**
 * A group is one teacher and one language, taught to several students.
 *
 * The language is the group's own, not any member's: it is what every class it
 * produces is taught in, and what decides which teachers may take it.
 */
export const groupFormSchema = z.object({
  name: z
    .string("Enter a name")
    .trim()
    .min(2, "Enter a name")
    .max(60, "That name is too long"),
  teacherId: z.string("Select a teacher").min(1, "Select a teacher"),
  languageId: z.string("Select a language").min(1, "Select a language"),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export type GroupFormInput = z.infer<typeof groupFormSchema>;

export const groupMemberSchema = z.object({
  groupId: z.string().min(1),
  studentId: z.string("Select a student").min(1, "Select a student"),
});

export type GroupMemberInput = z.infer<typeof groupMemberSchema>;
