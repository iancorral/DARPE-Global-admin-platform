import type { Currency, PaymentMethod } from "@/generated/prisma/client";

/**
 * How DARPE counts money, and how it is written down.
 *
 * Two rules hold everywhere in here:
 *
 * 1. **Revenue is recognised when the money arrives**, never when it was agreed.
 *    A payment's `receivedOn` is the only date that decides which month it
 *    belongs to.
 * 2. **Currencies are never mixed into one figure.** DARPE charges in pesos and
 *    in dollars, and there is no exchange rate in the product — adding them
 *    would produce a number that is true in no currency at all. Totals are
 *    always per currency.
 */

export const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "STRIPE", "TRANSFER"];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  STRIPE: "Stripe",
  TRANSFER: "Transfer",
};

export const CURRENCIES: Currency[] = ["MXN", "USD"];

/** Integer cents as a readable amount: 238000 → "$2,380 MXN". */
export function formatAmount(amountCents: number, currency: Currency): string {
  const units = Math.round(amountCents / 100);

  return `$${units.toLocaleString("en-US")} ${currency}`;
}

/**
 * "2380.50" → 238050 cents.
 *
 * Parsed by splitting on the decimal point rather than multiplying by 100,
 * because `2380.15 * 100` is 238014.99999999997 in binary floating point and
 * would round a peso away. Returns null for anything that is not an amount, so
 * a caller reports it instead of storing a zero.
 */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const [whole = "0", fraction = ""] = cleaned.split(".");

  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export type CurrencyTotal = { currency: Currency; amountCents: number };

/**
 * Sums amounts, keeping each currency apart.
 *
 * Only currencies actually present come back, so a month with no dollar income
 * shows one figure rather than a misleading "$0 USD" beside it.
 */
export function totalByCurrency(
  entries: { amountCents: number; currency: Currency }[]
): CurrencyTotal[] {
  const totals = new Map<Currency, number>();

  for (const entry of entries) {
    totals.set(entry.currency, (totals.get(entry.currency) ?? 0) + entry.amountCents);
  }

  return [...totals.entries()]
    .map(([currency, amountCents]) => ({ currency, amountCents }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

/** Every currency total written out, or a plain zero when there is nothing. */
export function formatTotals(totals: CurrencyTotal[]): string {
  if (totals.length === 0) return "$0 MXN";

  return totals.map((total) => formatAmount(total.amountCents, total.currency)).join(" + ");
}

export type TeachingLoad = {
  /** Completed classes only — what was actually taught. */
  classes: number;
  minutes: number;
  individualClasses: number;
  groupClasses: number;
};

/**
 * What a teacher actually taught in a period.
 *
 * Counted from completed classes alone: a scheduled class has not happened yet,
 * and a cancelled one did not. Whether DARPE pays for a cancelled class is an
 * open question, and this deliberately does not answer it — it reports what was
 * taught, and the amount owed is entered by hand until that rule is settled.
 */
export function teachingLoad(
  sessions: { durationMinutes: number; type: "INDIVIDUAL" | "GROUP" }[]
): TeachingLoad {
  return {
    classes: sessions.length,
    minutes: sessions.reduce((total, session) => total + session.durationMinutes, 0),
    individualClasses: sessions.filter((session) => session.type === "INDIVIDUAL").length,
    groupClasses: sessions.filter((session) => session.type === "GROUP").length,
  };
}

/** Minutes as the hours a person would say: 90 → "1.5 h", 60 → "1 h". */
export function formatHours(minutes: number): string {
  const hours = minutes / 60;

  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}
