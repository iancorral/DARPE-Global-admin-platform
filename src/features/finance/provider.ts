import "server-only";
import { env } from "@/lib/env";
import { demoFinanceSnapshot } from "./demo-fixture";
import type { FinanceSnapshot } from "./snapshot";

/**
 * Where the dashboard's finance figures come from.
 *
 * Today there is exactly one source and it is a demo fixture, off unless
 * `DARPE_DEMO_FINANCE` is set. There is no real source yet because DARPE has
 * not decided what revenue means, when it is recognised, or how students are
 * charged — and the application must not imply otherwise. With the flag off
 * this returns null and the dashboard says plainly that finance is not
 * configured.
 *
 * When the real models exist, this function is the only thing that changes:
 * it queries them and returns the same `FinanceSnapshot`.
 */
export function getFinanceSnapshot(monthStartDate: string): FinanceSnapshot | null {
  if (!env.DARPE_DEMO_FINANCE) return null;

  return demoFinanceSnapshot(monthStartDate);
}
