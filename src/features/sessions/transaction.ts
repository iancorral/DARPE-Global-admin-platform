import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type ActionFailure = { success: false; error: string };

export type ActionResult = { success: true } | ActionFailure;

/** Prisma's code for a transaction rolled back because it could not be serialized. */
const SERIALIZATION_FAILURE = "P2034";

const CONCURRENT_UPDATE_ERROR =
  "Someone updated that time at the same moment. Please try again.";

/**
 * Runs a scheduling decision and the write it leads to as one serializable
 * transaction.
 *
 * Checking a teacher's availability and then booking them are two statements, and
 * between them another coordinator can book the same teacher: both checks pass,
 * both writes land, and the teacher is double-booked. Serializable isolation makes
 * Postgres refuse one of the two, which turns a silent double-booking into a
 * retryable message.
 *
 * Only the serialization failure is translated. Anything else is a real fault and
 * is rethrown untouched, so it reaches the project's normal error handling instead
 * of being reported to staff as a scheduling clash.
 *
 * It lives here rather than beside one action because every booking needs it —
 * a single class, a move, a reopened class and a whole weekly series alike — and
 * a "use server" module cannot export a helper for the others to share.
 */
export async function inSchedulingTransaction<T>(
  run: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T | ActionFailure> {
  try {
    return await db.$transaction(run, { isolationLevel: "Serializable" });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === SERIALIZATION_FAILURE
    ) {
      return { success: false, error: CONCURRENT_UPDATE_ERROR };
    }

    throw error;
  }
}
