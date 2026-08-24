import "server-only";
import { isMissingTable } from "@/lib/db-errors";
import { formatInZone, parseDateOnly } from "@/lib/datetime";
import { getFinanceOverview } from "./queries";
import { totalByCurrency } from "./money";
import type { FinanceSnapshot } from "./snapshot";

/**
 * The dashboard's money panel, from money actually received.
 *
 * The demo fixture this used to serve is gone: DARPE records real payments now,
 * so invented figures would compete with them. A month with no payments shows
 * zero, which is true, rather than a placeholder.
 *
 * Pesos only. The snapshot carries one currency, and adding pesos to dollars
 * for a single headline would state a number that is true in neither — the
 * finance screen is where both are shown side by side.
 */
export async function getFinanceSnapshot(
  monthStartDate: string
): Promise<FinanceSnapshot | null> {
  let overview: Awaited<ReturnType<typeof getFinanceOverview>>;

  try {
    overview = await getFinanceOverview();
  } catch (error) {
    /*
     * P2021 — the payments tables are not on this database yet, because the
     * migration adding them has not run. Same rule as the settings table: code
     * that ships ahead of its migration degrades instead of taking the whole
     * dashboard down with it, and the panel says finance is not set up. Every
     * other error is a real fault and is rethrown untouched.
     */
    if (isMissingTable(error)) return null;
    throw error;
  }

  const pesos = (totals: ReturnType<typeof totalByCurrency>) =>
    totals.find((total) => total.currency === "MXN")?.amountCents ?? 0;

  return {
    currency: "MXN",
    currentMonthLabel: formatInZone(parseDateOnly(monthStartDate), "UTC", "MMMM"),
    currentMonthRevenueCents: pesos(overview.monthReceived),
    previousMonthRevenueCents: pesos(overview.previousMonthReceived),
    outstandingCents: overview.unpaidPayouts.reduce(
      (total, payout) => total + (payout.currency === "MXN" ? payout.amountCents : 0),
      0
    ),
    outstandingCount: overview.unpaidPayouts.length,
    monthlyRevenue: overview.monthly.map((month) => ({
      monthStart: month.monthStart,
      label: month.label,
      amountCents: pesos(month.totals),
    })),
  };
}
