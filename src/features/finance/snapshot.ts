/**
 * The shape the dashboard needs to show money — and nothing else.
 *
 * A presentation boundary, not a data model: the dashboard shows one currency
 * and one headline, while the finance screen shows pesos and dollars side by
 * side. Keeping that reduction here means the finance queries never have to
 * think about the dashboard.
 *
 * Amounts are integer cents. Money never touches a float.
 */

export type MoneySeriesPoint = {
  /** First day of the month, YYYY-MM-DD — stable key and sort order. */
  monthStart: string;
  /** Short label, e.g. "Aug". */
  label: string;
  amountCents: number;
};

export type FinanceSnapshot = {
  /** ISO 4217, e.g. "MXN". Formatting is the component's job, not the data's. */
  currency: string;
  currentMonthLabel: string;
  currentMonthRevenueCents: number;
  previousMonthRevenueCents: number;
  /** Still owed to teachers: completed classes not yet paid. Never students. */
  outstandingCents: number;
  /** How many teachers make up `outstandingCents`, when known. */
  outstandingCount: number | null;
  /** Oldest first; the last point is the current month. */
  monthlyRevenue: MoneySeriesPoint[];
};

/**
 * How this month compares with last, as a whole-percent change.
 *
 * Null when there is no previous month to compare against, or when last month
 * was zero — "up 100%" from nothing is not a fact worth stating.
 */
export function revenueChangePercent(snapshot: {
  currentMonthRevenueCents: number;
  previousMonthRevenueCents: number;
}): number | null {
  if (snapshot.previousMonthRevenueCents <= 0) return null;

  const change =
    ((snapshot.currentMonthRevenueCents - snapshot.previousMonthRevenueCents) /
      snapshot.previousMonthRevenueCents) *
    100;

  return Math.round(change);
}

/**
 * Integer cents as a readable amount, e.g. 8640000 → "$86,400 MXN".
 *
 * Whole units only: these are operational figures read at a glance, and
 * trailing cents add noise without adding meaning. Rounding here is a display
 * choice and never feeds a calculation.
 */
export function formatMoney(amountCents: number, currency: string): string {
  const units = Math.round(amountCents / 100);
  return `$${units.toLocaleString("en-US")} ${currency}`;
}
