/**
 * Payments in other currencies, counted in pesos.
 *
 * DARPE keeps its books in pesos. A student abroad may pay in dollars, Canadian
 * dollars or euros; the payment is recorded at what it came to in pesos, with
 * the original amount and the rate kept beside it for reference. Every total
 * in the app is then a single peso figure.
 *
 * The rate is typed in, not fetched: what matters is what actually reached
 * DARPE's account, and staff can read that off the bank or Stripe. A live rate
 * would be a guess at a number they already have.
 *
 * Rates are integers — pesos per unit times a million — so a rate never passes
 * through floating point on its way into the database.
 */
export const PAYMENT_CURRENCIES = ["MXN", "USD", "CAD", "EUR"] as const;
export type PaymentCurrency = (typeof PAYMENT_CURRENCIES)[number];

export const PAYMENT_CURRENCY_LABELS: Record<PaymentCurrency, string> = {
  MXN: "MXN · pesos",
  USD: "USD · US dollars",
  CAD: "CAD · Canadian dollars",
  EUR: "EUR · euros",
};

const RATE_SCALE = 1_000_000;
/** The column is a 32-bit integer; this keeps any rate inside it. */
const MAX_RATE_MICROS = 2_147_483_647;

/**
 * "17.07" → 17070000. Up to six decimals; commas and spaces ignored.
 * Null for anything that is not a positive rate.
 */
export function parseRateToMicros(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{1,6})?$/.test(cleaned)) return null;

  const [whole = "0", fraction = ""] = cleaned.split(".");
  const micros = Number(whole) * RATE_SCALE + Number(fraction.padEnd(6, "0"));

  return micros > 0 && micros <= MAX_RATE_MICROS ? micros : null;
}

/** An amount in another currency, in peso cents at the given rate. */
export function convertToMxnCents(amountCents: number, rateMicros: number): number {
  return Math.round((amountCents * rateMicros) / RATE_SCALE);
}

/** 17070000 → "17.07". */
export function formatRate(rateMicros: number): string {
  return (rateMicros / RATE_SCALE).toFixed(6).replace(/\.?0+$/, "");
}
