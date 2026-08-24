import { z } from "zod";
import { parseAmountToCents } from "./money";

const CURRENCIES = ["MXN", "USD"] as const;
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
 * Money received from a student.
 *
 * There is no "amount owed" to check it against: DARPE recognises revenue when
 * the money arrives, and what a student was expected to pay is not modelled.
 * So this records a fact, and the only validation is that the fact is coherent.
 */
export const recordPaymentSchema = z.object({
  studentId: z.string("Select a student").min(1, "Select a student"),
  amount: amountSchema,
  currency: z.enum(CURRENCIES),
  method: z.enum(METHODS),
  receivedOn: dateSchema,
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;

export const deletePaymentSchema = z.object({ id: z.string().min(1) });

/**
 * A teacher's settlement for a period.
 *
 * The amount is entered rather than calculated: DARPE already knows what each
 * teacher earns, and the rule for a cancelled class is still open. What the
 * product adds is the record of whether it has been paid.
 */
export const savePayoutSchema = z
  .object({
    teacherId: z.string("Select a teacher").min(1, "Select a teacher"),
    periodStart: dateSchema,
    periodEnd: dateSchema,
    amount: amountSchema,
    currency: z.enum(CURRENCIES),
    notes: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .refine((payout) => payout.periodStart <= payout.periodEnd, {
    message: "The period has to end on or after it starts.",
    path: ["periodEnd"],
  });

export type SavePayoutInput = z.input<typeof savePayoutSchema>;

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
