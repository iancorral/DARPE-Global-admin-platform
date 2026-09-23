import { z } from "zod";
import { parseAmountToCents } from "./money";
import { PAYMENT_CURRENCIES, convertToMxnCents, parseRateToMicros } from "./currency";

const METHODS = ["CASH", "STRIPE", "TRANSFER"] as const;

/**
 * An amount as typed, turned into integer cents.
 *
 * The form sends a string because that is what a text field holds, and the
 * conversion happens here so every writer of money goes through the same
 * parser — the one that does not lose a peso to floating point.
 */
const amountSchema = z
  .string("Enter an amount")
  .trim()
  .min(1, "Enter an amount")
  .transform((value, ctx) => {
    const cents = parseAmountToCents(value);

    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 2380 or 2380.50" });
      return z.NEVER;
    }

    return cents;
  });

const dateSchema = z
  .string("Choose a date")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

/**
 * Money received from a student, always counted in pesos.
 *
 * A payment in another currency arrives with the rate it was converted at;
 * the output carries the peso amount every total uses, plus the original for
 * reference. There is no "amount owed" to check it against: DARPE recognises
 * revenue when the money arrives, so this records a fact.
 */
export const recordPaymentSchema = z
  .object({
    studentId: z.string("Select a student").min(1, "Select a student"),
    amount: amountSchema,
    currency: z.enum(PAYMENT_CURRENCIES),
    /** Pesos per one unit of `currency`. Required unless paying in pesos. */
    exchangeRate: z.string().trim().optional(),
    method: z.enum(METHODS),
    receivedOn: dateSchema,
    notes: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .transform((input, ctx) => {
    const base = {
      studentId: input.studentId,
      method: input.method,
      receivedOn: input.receivedOn,
      notes: input.notes,
    };

    if (input.currency === "MXN") {
      return { ...base, amountCents: input.amount, original: null };
    }

    const rateMicros = parseRateToMicros(input.exchangeRate ?? "");
    if (rateMicros === null) {
      ctx.addIssue({
        code: "custom",
        path: ["exchangeRate"],
        message: `Enter what one ${input.currency} is worth in pesos, like 17.07`,
      });
      return z.NEVER;
    }

    return {
      ...base,
      amountCents: convertToMxnCents(input.amount, rateMicros),
      original: { currency: input.currency, amountCents: input.amount, rateMicros },
    };
  });

export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;


/**
 * Paying a teacher for one week of completed classes.
 *
 * No amount: the server works it out from the classes and DARPE's rates, so
 * what is recorded is always what the calendar and the rates say.
 */
export const payTeacherWeekSchema = z.object({
  teacherId: z.string("Select a teacher").min(1, "Select a teacher"),
  weekStart: dateSchema,
  method: z.enum(METHODS),
});

export type PayTeacherWeekInput = z.infer<typeof payTeacherWeekSchema>;

/**
 * Marking a payout settled, or unsettling it.
 *
 * `paidOn` null is a deliberate value, not a missing one: it is how a payout
 * marked by mistake is put back to unpaid.
 */
export const settlePayoutSchema = z.object({
  id: z.string().min(1),
  paidOn: dateSchema.nullable(),
  method: z.enum(METHODS).nullable(),
});

export type SettlePayoutInput = z.infer<typeof settlePayoutSchema>;
