"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { firstValidationMessage } from "@/features/sessions/schemas";
import { canManageTeam, canResetPasswordOf } from "./roles";
import {
  addTeamMemberSchema,
  resetTeamPasswordSchema,
  type AddTeamMemberInput,
  type ResetTeamPasswordInput,
} from "./schemas";

/**
 * Local, not exported: this module is a `"use server"` entrypoint, so its
 * runtime exports must be async Server Actions and nothing else.
 */
type ActionResult = { success: true } | { success: false; error: string };

const NOT_ALLOWED = "Only the owner or an admin can manage accounts.";
const NOT_CONFIGURED = "Account management isn't set up on this server yet.";

/**
 * Creates an account and its profile in one step.
 *
 * The two used to be separate — a Supabase user made in its dashboard, then a
 * profile row made by hand — and forgetting the second left a person who could
 * sign in and see nothing. Here the profile is written straight after the
 * account, and if it fails the account is deleted again, so the two cannot
 * drift apart.
 *
 * The password is a temporary one the person replaces on first sign-in; the
 * account is confirmed up front, because nobody here wants a confirmation email
 * to be the thing standing between Gaby and the app.
 */
export async function addTeamMember(input: AddTeamMemberInput): Promise<ActionResult> {
  const me = await requireUser();
  if (!canManageTeam(me.role)) return { success: false, error: NOT_ALLOWED };

  const parsed = addTeamMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstValidationMessage(parsed.error, "Please check the form and try again."),
    };
  }

  const admin = createAdminClient();
  if (!admin) return { success: false, error: NOT_CONFIGURED };

  const { name, email, role, temporaryPassword } = parsed.data;

  const taken = await db.profile.findUnique({ where: { email }, select: { id: true } });
  if (taken) return { success: false, error: "That email already has an account." };

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error || !data.user) {
    return {
      success: false,
      // Only the one case worth naming. Anything else says so plainly rather
      // than passing Supabase's own wording — and whatever it reveals about the
      // auth service — through to the screen.
      error: error?.message.toLowerCase().includes("already")
        ? "That email already has an account."
        : "The account could not be created.",
    };
  }

  try {
    await db.profile.create({ data: { id: data.user.id, email, name, role } });
  } catch (profileError) {
    // Without its profile the account could sign in and see nothing. Undo it.
    await admin.auth.admin.deleteUser(data.user.id);
    throw profileError;
  }

  revalidatePath("/settings");
  return { success: true };
}

/**
 * Gives somebody a new temporary password — for a forgotten one.
 *
 * Their notice to choose their own comes back, because the new password is one
 * the person resetting it knows. Your own password is changed under Your
 * account instead, which asks for the current one.
 */
export async function resetTeamMemberPassword(
  input: ResetTeamPasswordInput
): Promise<ActionResult> {
  const me = await requireUser();
  if (!canManageTeam(me.role)) return { success: false, error: NOT_ALLOWED };

  const parsed = resetTeamPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstValidationMessage(parsed.error, "Please check the form and try again."),
    };
  }

  const { profileId, temporaryPassword } = parsed.data;

  if (profileId === me.id) {
    return { success: false, error: "Change your own password under Your account." };
  }

  const admin = createAdminClient();
  if (!admin) return { success: false, error: NOT_CONFIGURED };

  const target = await db.profile.findUnique({
    where: { id: profileId },
    select: { id: true, role: true },
  });
  if (!target) return { success: false, error: "That person no longer has an account." };
  // Checked here, not only by hiding the button: an admin account must never
  // be reset from the app, however the request arrives.
  if (!canResetPasswordOf(me.role, target.role)) {
    return { success: false, error: "Only this person can change this account's password." };
  }

  const { error } = await admin.auth.admin.updateUserById(profileId, {
    password: temporaryPassword,
  });
  if (error) {
    // Supabase refuses a password its own rules reject (too short, known
    // leaked). Say that much without repeating the service's message.
    return { success: false, error: "That password was refused. Try another one." };
  }

  await db.profile.update({ where: { id: profileId }, data: { passwordSetAt: null } });

  revalidatePath("/settings");
  return { success: true };
}
