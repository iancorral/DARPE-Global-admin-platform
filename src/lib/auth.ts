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

export async function requireUser() {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}