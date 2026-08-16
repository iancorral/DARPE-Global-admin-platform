/**
 * The shape the dashboard needs to show money — and nothing else.
 *
 * This is a presentation boundary, not a data model. It exists so the finance
 * section of the dashboard can be designed and reviewed before DARPE has
 * decided how it charges, what counts as revenue, or when revenue is
 * recognised. None of those questions are answered here, and nothing in this
 * type should be read as an answer: when the real schema arrives, a
 * Prisma-backed provider returns this same shape and the components do not
 * change.
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

export type PaymentStatusSlice = {
  label: string;
  amountCents: number;
};

export type FinanceSnapshot = {
  /** ISO 4217, e.g. "MXN". Formatting is the component's job, not the data's. */
  currency: string;
  currentMonthLabel: string;
  currentMonthRevenueCents: number;
  previousMonthRevenueCents: number;
  outstandingCents: number;
  /** Number of unsettled items making up `outstandingCents`, when known. */
  outstandingCount: number | null;
  /** Oldest first; the last point is the current month. */
  monthlyRevenue: MoneySeriesPoint[];
  paymentStatus: PaymentStatusSlice[];
  /**
   * True when the numbers come from the demo fixture rather than real records.
   * The UI must show this plainly wherever the figures appear.
   */
  isSample: boolean;
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
