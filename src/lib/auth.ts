import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await db.profile.findUnique({
    where: { id: user.id },
  });

  return profile;
}

export async function requireUser() {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}