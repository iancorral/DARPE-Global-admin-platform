"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { DEFAULT_TIMEZONE, parseDateOnly, startOfWeekDate, todayInZone } from "@/lib/datetime";
import { firstValidationMessage } from "@/features/sessions/schemas";
import { payWeekEnd } from "./teacher-pay";
import { teacherWeekPayCents } from "./queries";
import {
  payTeacherWeekSchema,
  recordPaymentSchema,
  settlePayoutSchema,
  type PayTeacherWeekInput,
  type RecordPaymentInput,
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

/**
 * Records money received from a student, in pesos.
 *
 * A payment in another currency is stored at its peso value — the figure every
 * total adds up — with what was actually paid and the rate kept beside it.
 */
export async function recordPayment(input: RecordPaymentInput): Promise<ActionResult> {
  await requireUser();

  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstValidationMessage(parsed.error, "Please check the form and try again."),
    };
  }

  const { studentId, amountCents, original, method, receivedOn, notes } = parsed.data;

  try {
    await db.payment.create({
      data: {
        studentId,
        amountCents,
        currency: "MXN",
        method,
        receivedOn: parseDateOnly(receivedOn),
        notes: notes || null,
        originalCurrency: original?.currency ?? null,
        originalAmountCents: original?.amountCents ?? null,
        exchangeRateMicros: original?.rateMicros ?? null,
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
 * Marks a teacher paid for one week, at what their completed classes come to.
 *
 * The amount is worked out here, on the server, from the classes and the rates
 * — never taken from the screen — so the record cannot disagree with the
 * calendar. Paying the same week again updates it: if a class was completed
 * late, paying again records the corrected figure instead of a second payout.
 */
export async function payTeacherWeek(input: PayTeacherWeekInput): Promise<ActionResult> {
  await requireUser();

  const parsed = payTeacherWeekSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: firstValidationMessage(parsed.error, "Please check the form and try again."),
    };
  }

  const { teacherId, weekStart, method } = parsed.data;

  if (startOfWeekDate(weekStart) !== weekStart) {
    return { success: false, error: "A pay week starts on a Monday." };
  }

  const amountCents = await teacherWeekPayCents(teacherId, weekStart);
  if (amountCents === 0) {
    return { success: false, error: "There are no completed classes to pay for that week." };
  }

  const period = {
    teacherId,
    periodStart: parseDateOnly(weekStart),
    periodEnd: parseDateOnly(payWeekEnd(weekStart)),
  };
  const paidOn = parseDateOnly(todayInZone(DEFAULT_TIMEZONE));

  try {
    await db.teacherPayout.upsert({
      where: { teacherId_periodStart_periodEnd: period },
      update: { amountCents, currency: "MXN", paidOn, method },
      create: { ...period, amountCents, currency: "MXN", paidOn, method },
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
