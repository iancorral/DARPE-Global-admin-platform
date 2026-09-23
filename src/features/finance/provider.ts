import "server-only";
import { isMissingTable } from "@/lib/db-errors";
import { DEFAULT_TIMEZONE, formatInZone, parseDateOnly, todayInZone } from "@/lib/datetime";
import { getFinanceOverview, getTeacherOwed } from "./queries";
import { totalByCurrency } from "./money";
import type { FinanceSnapshot } from "./snapshot";

/**
 * The dashboard's money panel, from money actually received.
 *
 * A month with no payments shows zero, which is true, rather than a
 * placeholder. Everything is in pesos: payments in other currencies are
 * recorded at their peso value.
 */
export async function getFinanceSnapshot(
  monthStartDate: string
): Promise<FinanceSnapshot | null> {
  let overview: Awaited<ReturnType<typeof getFinanceOverview>>;
  let owed: Awaited<ReturnType<typeof getTeacherOwed>>;

  try {
    [overview, owed] = await Promise.all([
      getFinanceOverview(),
      getTeacherOwed(todayInZone(DEFAULT_TIMEZONE)),
    ]);
  } catch (error) {
    /*
     * P2021 — the payments tables are not on this database yet, because the
     * migration adding them has not run. Code that ships ahead of its migration
     * degrades instead of taking the whole dashboard down with it. Every other
     * error is a real fault and is rethrown untouched.
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
    outstandingCents: owed.totalCents,
    outstandingCount: owed.teachers.length,
    monthlyRevenue: overview.monthly.map((month) => ({
      monthStart: month.monthStart,
      label: month.label,
      amountCents: pesos(month.totals),
    })),
  };
}
