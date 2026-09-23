import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  /*
   * Supabase's secret key, server-only. Optional: without it the app runs
   * normally and only account management — adding people, resetting passwords —
   * is unavailable. Never give it a NEXT_PUBLIC_ prefix.
   *
   * An empty value means "not set", the same as leaving the line out:
   * `.env.example` ships it as `SUPABASE_SECRET_KEY=`, and a copied example
   * used to take the whole app down over a feature it does not need.
   */
  SUPABASE_SECRET_KEY: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(1).optional()
  ),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid or missing environment variables: ${missing}`);
}

export const env = parsed.data;