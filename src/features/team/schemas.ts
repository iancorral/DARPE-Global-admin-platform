import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "@/features/auth/schemas";
import { ASSIGNABLE_ROLES } from "./roles";

const temporaryPassword = z
  .string("Enter a temporary password")
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(72, "That password is too long");

export const addTeamMemberSchema = z.object({
  name: z.string("Enter their name").trim().min(2, "Enter their name").max(80),
  email: z.string("Enter their email").trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(ASSIGNABLE_ROLES),
  temporaryPassword,
});

export type AddTeamMemberInput = z.input<typeof addTeamMemberSchema>;

export const resetTeamPasswordSchema = z.object({
  profileId: z.string().uuid("Choose someone on the team"),
  temporaryPassword,
});

export type ResetTeamPasswordInput = z.input<typeof resetTeamPasswordSchema>;
