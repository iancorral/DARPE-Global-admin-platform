import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * The shortest password DARPE will accept.
 *
 * Length is the only rule. Composition requirements — a capital, a digit, a
 * symbol — are what produce `Darpe2026!` on a sticky note, and current guidance
 * (NIST SP 800-63B) drops them in favour of a longer minimum. Ten characters of
 * anything is far past the four-digit code the accounts start on.
 *
 * Supabase enforces its own minimum as well. This one is deliberately stricter,
 * so the rule staff actually meet is the one written here.
 */
export const MIN_PASSWORD_LENGTH = 10;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string("Enter your current password").min(1, "Enter your current password"),
    newPassword: z
      .string("Enter a new password")
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(72, "That password is too long"),
    confirmPassword: z.string("Type the new password again"),
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    message: "The two passwords do not match",
    path: ["confirmPassword"],
  })
  /*
   * Changing a password to itself is the one way this form could report success
   * while leaving somebody on the password that was handed to them.
   */
  .refine((input) => input.newPassword !== input.currentPassword, {
    message: "That is the password you already have — choose a different one",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
