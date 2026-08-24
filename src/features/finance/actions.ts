"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { parseDateOnly } from "@/lib/datetime";
import { firstValidationMessage } from "@/features/sessions/schemas";
import {
  deletePaymentSchema,
  recordPaymentSchema,
  savePayoutSchema,
  settlePayoutSchema,
  type RecordPaymentInput,
  type SavePayoutInput,
  type SettlePayoutInput,
} from "./schemas";

/**
 * Local, not exported: this module is a `"use server"` entrypoint, so its
 * runtime exports must be async Server Actions and nothing else.
 */
type ActionResult = { success: true } | { success: false; error: string };

function revalidateMoney() {
  revalidatePath("/payments");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

/** Records money received from a student. */
export async function recordPayment(input: RecordPaymentInput): Promise<ActionResult> {
  await requireUser();

  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstValidationMessage(parsed.error, "Please check the form and try again."),
    };
  }

  const { studentId, amount, currency, method, receivedOn, notes } = parsed.data;

  try {
    await db.payment.create({
      data: {
        studentId,
        amountCents: amount,
        currency,
        method,
        receivedOn: parseDateOnly(receivedOn),
        notes: notes || null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return { success: false, error: "That student no longer exists." };
    }
    throw error;
  }

  revalidateMoney();
  return { success: true };
}

/**
 * Removes a payment.
 *
 * Kept deliberately blunt: a payment recorded by mistake is corrected by
 * deleting it and recording the right one. There is no partial edit, because a
 * half-corrected payment is harder to reason about than a replaced one.
 */
export async function deletePayment(input: { id: string }): Promise<ActionResult> {
  await requireUser();

  const parsed = deletePaymentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Select a payment to remove." };

  await db.payment.deleteMany({ where: { id: parsed.data.id } });

  revalidateMoney();
  return { success: true };
}

/**
 * Records what a teacher is owed for a period.
 *
 * Upserted on the period, so settling the same fortnight twice corrects the
 * figure instead of creating a second payout beside it. Marking it paid is a
 * separate step, because entering the amount and paying it rarely happen at
 * the same moment.
 */
export async function savePayout(input: SavePayoutInput): Promise<ActionResult> {
  await requireUser();

  const parsed = savePayoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstValidationMessage(parsed.error, "Please check the form and try again."),
    };
  }

  const { teacherId, periodStart, periodEnd, amount, currency, notes } = parsed.data;

  try {
    await db.teacherPayout.upsert({
      where: {
        teacherId_periodStart_periodEnd: {
          teacherId,
          periodStart: parseDateOnly(periodStart),
          periodEnd: parseDateOnly(periodEnd),
        },
      },
      update: { amountCents: amount, currency, notes: notes || null },
      create: {
        teacherId,
        periodStart: parseDateOnly(periodStart),
        periodEnd: parseDateOnly(periodEnd),
        amountCents: amount,
        currency,
        notes: notes || null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return { success: false, error: "That teacher no longer exists." };
    }
    throw error;
  }

  revalidateMoney();
  return { success: true };
}

/**
 * Marks a payout paid, or puts it back to unpaid.
 *
 * `paidOn: null` is how a mistaken mark is undone — the record stays, so the
 * amount agreed is not lost along with the correction.
 */
export async function settlePayout(input: SettlePayoutInput): Promise<ActionResult> {
  await requireUser();

  const parsed = settlePayoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstValidationMessage(parsed.error, "Please check the form and try again."),
    };
  }

  const { id, paidOn, method } = parsed.data;

  if (paidOn && !method) {
    return { success: false, error: "Choose how the teacher was paid." };
  }

  const updated = await db.teacherPayout.updateMany({
    where: { id },
    data: {
      paidOn: paidOn ? parseDateOnly(paidOn) : null,
      // Clearing the mark clears how it was paid too; keeping a method on an
      // unpaid payout would describe something that did not happen.
      method: paidOn ? method : null,
    },
  });

  if (updated.count === 0) {
    return { success: false, error: "That payout no longer exists." };
  }

  revalidateMoney();
  return { success: true };
}
