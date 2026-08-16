import "server-only";
import { formatInZone, parseDateOnly } from "@/lib/datetime";
import type { FinanceSnapshot, MoneySeriesPoint } from "./snapshot";

/**
 * SAMPLE DATA — NOT REAL, NOT A BUSINESS DEFINITION.
 *
 * Invented figures whose only purpose is to evaluate the layout, hierarchy,
 * colour and interaction of the dashboard's finance section before DARPE has
 * any financial records. They are shown only when `DARPE_DEMO_FINANCE` is on,
 * always behind a visible "Sample data" badge.
 *
 * Hard rules for this module:
 *   - it never reads or writes the database;
 *   - nothing in `queries.ts` or any server action may import it;
 *   - the amounts here must never inform the future invoice, payment or payout
 *     schema — they are placeholders, not decisions.
 *
 * Deleting this file and pointing the provider at a real implementation is the
 * whole migration path.
 */

/** Shape of the curve, in whole pesos, oldest first. Arbitrary and invented. */
const SAMPLE_MONTHLY_PESOS = [52_200, 58_400, 61_800, 67_500, 72_300, 79_800, 86_400];

const SAMPLE_OUTSTANDING_PESOS = 7_850;
const SAMPLE_OUTSTANDING_COUNT = 3;

/** First day of the month `monthsBack` before the given academy month. */
function shiftMonth(monthStartDate: string, monthsBack: number): string {
  const year = Number(monthStartDate.slice(0, 4));
  const month = Number(monthStartDate.slice(5, 7));
  const zeroBased = year * 12 + (month - 1) - monthsBack;

  return `${Math.floor(zeroBased / 12)}-${String((zeroBased % 12) + 1).padStart(2, "0")}-01`;
}

/**
 * A snapshot anchored to the real current month, so the chart's axis matches
 * the calendar staff are looking at even though the amounts are invented.
 */
export function demoFinanceSnapshot(monthStartDate: string): FinanceSnapshot {
  const monthlyRevenue: MoneySeriesPoint[] = SAMPLE_MONTHLY_PESOS.map((pesos, index) => {
    const monthStart = shiftMonth(monthStartDate, SAMPLE_MONTHLY_PESOS.length - 1 - index);

    return {
      monthStart,
      label: formatInZone(parseDateOnly(monthStart), "UTC", "MMM"),
      amountCents: pesos * 100,
    };
  });

  const current = monthlyRevenue[monthlyRevenue.length - 1]?.amountCents ?? 0;
  const previous = monthlyRevenue[monthlyRevenue.length - 2]?.amountCents ?? 0;

  return {
    currency: "MXN",
    currentMonthLabel: formatInZone(parseDateOnly(monthStartDate), "UTC", "MMMM"),
    currentMonthRevenueCents: current,
    previousMonthRevenueCents: previous,
    outstandingCents: SAMPLE_OUTSTANDING_PESOS * 100,
    outstandingCount: SAMPLE_OUTSTANDING_COUNT,
    monthlyRevenue,
    paymentStatus: [
      { label: "Paid", amountCents: (current - SAMPLE_OUTSTANDING_PESOS * 100) },
      { label: "Outstanding", amountCents: SAMPLE_OUTSTANDING_PESOS * 100 },
    ],
    isSample: true,
  };
}
