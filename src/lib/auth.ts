import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * Wrapped in React's per-request cache: the layout guards every page with this
 * and pages that personalize (the dashboard greeting) read it again, so without
 * the cache each request would verify the session and fetch the profile twice.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await db.profile.findUnique({
    where: { id: user.id },
  });

  return profile;
});

/**
 * The email on the current session, whether or not it has a DARPE profile.
 *
 * Only for telling somebody which account they are signed in as when that
 * account has no profile. Everything else must go through `getCurrentUser`,
 * which answers the question that matters: who this is *to DARPE*.
 */
export const getSignedInEmail = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return user?.email ?? null;
});

export async function requireUser() {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}