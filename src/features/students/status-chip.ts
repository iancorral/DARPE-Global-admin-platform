import type { BillingStatus, StudentStatus } from "@/generated/prisma/client";
import type { Tone } from "@/lib/tone";
import { BILLING_STATUS_LABELS, STUDENT_STATUS_LABELS } from "./schemas";

/**
 * The one chip staff read on a student.
 *
 * DARPE's own register shows a single coloured label per student — paid,
 * pending, reserved, benefit, collaboration — and that is what the list must
 * look like. Underneath, the app keeps two fields, because a student on benefit
 * can still pause and the archive rule needs to know. This is where the two
 * become the one label again.
 *
 * The lifecycle wins whenever it is not ACTIVE: somebody paused or archived is
 * that first and "pending" second, and showing them in red as though they owed
 * for a course they are not taking would be wrong.
 *
 * `null` tone means a plain neutral chip, the way COLABORACIÓN reads as grey in
 * DARPE's register: an arrangement, not a state to act on.
 */
export type StatusChip = { label: string; tone: Tone | null };

const BILLING_TONES: Record<BillingStatus, Tone | null> = {
  PAID: "teal",
  PENDING: "rose",
  RESERVED: "amber",
  BENEFIT: "violet",
  COLLABORATION: null,
};

export function statusChip(status: StudentStatus, billing: BillingStatus): StatusChip {
  if (status === "ARCHIVED") {
    return { label: STUDENT_STATUS_LABELS.ARCHIVED, tone: "plum" };
  }

  // A pause is temporary and reads as one. Somebody who has stopped for good is
  // archived — that is what the register's INACTIVO means (Ian, 2026-09-14) — so
  // the app never shows "Inactive": the word used to stand for a pause and was
  // read as "gone", which is how inactive students ended up in the live lists.
  if (status === "PAUSED") {
    return { label: STUDENT_STATUS_LABELS.PAUSED, tone: "blue" };
  }

  return { label: BILLING_STATUS_LABELS[billing], tone: BILLING_TONES[billing] };
}
