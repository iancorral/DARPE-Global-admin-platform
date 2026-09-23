import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * A Supabase client holding the secret key, for managing accounts.
 *
 * Server-only, and used by exactly one feature — adding people and resetting
 * their passwords — because it can do anything to any account. Null when the
 * key is not configured, so callers say "not set up" instead of crashing.
 */
export function createAdminClient(): SupabaseClient | null {
  if (!env.SUPABASE_SECRET_KEY) return null;

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isAccountManagementConfigured(): boolean {
  return Boolean(env.SUPABASE_SECRET_KEY);
}
