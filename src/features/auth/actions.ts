"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { changePasswordSchema, loginSchema, type ChangePasswordInput } from "./schemas";
import type { ActionState, PasswordResult } from "./action-results";

export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Changes the signed-in person's own password.
 *
 * Two things make this safe rather than merely possible:
 *
 * 1. **The current password is checked first.** Supabase would update the
 *    password from the session alone, which means an unattended signed-in
 *    laptop is enough to lock the real owner out of their own account. Proving
 *    the current password costs one round trip and removes that entirely.
 * 2. **It can only ever change the caller's own account.** There is no id in the
 *    input — the account comes from the session, so nothing a client sends can
 *    point this at somebody else.
 *
 * `passwordSetAt` is stamped only after Supabase has accepted the new password,
 * so a failed change never leaves the app claiming they chose their own.
 */
export async function changePassword(input: ChangePasswordInput): Promise<PasswordResult> {
  const profile = await requireUser();

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
    };
  }

  const supabase = await createClient();

  const { error: wrongCurrent } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: parsed.data.currentPassword,
  });

  if (wrongCurrent) {
    return { success: false, error: "That is not your current password." };
  }

  const { error: refused } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (refused) {
    // Supabase's own rules (its minimum length, its leaked-password check) can
    // refuse a password this app accepted. Its message says which, and saying
    // "something went wrong" instead would leave somebody guessing.
    return {
      success: false,
      error: refused.message || "That password could not be set. Try a different one.",
    };
  }

  await db.profile.update({
    where: { id: profile.id },
    data: { passwordSetAt: new Date() },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}
