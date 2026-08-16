import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /*
   * Shows the dashboard's finance section filled with sample figures, so its
   * layout can be reviewed before DARPE records any money. Server-side only —
   * no `NEXT_PUBLIC_` prefix, so it never reaches the browser — and off unless
   * explicitly set to "true". Never enable it anywhere real numbers are
   * expected: everything it shows is invented.
   */
  DARPE_DEMO_FINANCE: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid or missing environment variables: ${missing}`);
}

export const env = parsed.data;