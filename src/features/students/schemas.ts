import { z } from "zod";

export const MODALITIES = [
  "ADVISORY",
  "GROUP_EXTENSIVE",
  "INDIVIDUAL_EXTENSIVE",
  "INDIVIDUAL_INTENSIVE",
] as const;

export const STUDENT_STATUSES = ["ACTIVE", "PAUSED", "ARCHIVED"] as const;

export const STUDENT_STATUS_LABELS: Record<(typeof STUDENT_STATUSES)[number], string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  ARCHIVED: "Archived",
};

/**
 * How the student's place is paid for — DARPE's own list, in English.
 *
 * Separate from the lifecycle above because they answer different questions:
 * an active student is *also* paid, pending, or on one of the arrangements.
 * The two bottom entries are not payment states at all; they are why no money
 * is expected.
 */
export const BILLING_STATUSES = [
  "PAID",
  "PENDING",
  "RESERVED",
  "BENEFIT",
  "COLLABORATION",
] as const;

export type BillingStatusValue = (typeof BILLING_STATUSES)[number];

export const BILLING_STATUS_LABELS: Record<BillingStatusValue, string> = {
  PAID: "Paid",
  PENDING: "Pending",
  RESERVED: "Reserved",
  BENEFIT: "Benefit",
  COLLABORATION: "Collaboration",
};

/** The one-line explanation staff see beside each option. */
export const BILLING_STATUS_HINTS: Record<BillingStatusValue, string> = {
  PAID: "Has paid for the current course",
  PENDING: "Owes the current course",
  RESERVED: "Place held, not paid yet",
  BENEFIT: "A DARPE teacher studying with another teacher",
  COLLABORATION: "Classes in exchange for work, such as videos",
};

/**
 * CEFR levels. A plain list rather than a database enum: DARPE is still
 * settling how it grades, and a list is cheap to change where an enum is a
 * migration.
 */
export const STUDENT_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type StudentLevel = (typeof STUDENT_LEVELS)[number];

/**
 * A stored level as a form value.
 *
 * The column is free text and predates the list, so a record may hold anything.
 * Anything not on the list becomes empty rather than being forced onto a level
 * it never had — an unreadable level is missing information, not a B1.
 */
export function asStudentLevel(value: string | null): StudentLevel | "" {
  return (STUDENT_LEVELS as readonly string[]).includes(value ?? "")
    ? (value as StudentLevel)
    : "";
}

export const studentFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  // Optional: DARPE's register holds many students by first name alone.
  lastName: z.string().trim().max(60).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  languageId: z.string().min(1, "Select a language"),
  primaryTeacherId: z.string().optional().or(z.literal("")),
  modality: z.enum(MODALITIES),
  status: z.enum(STUDENT_STATUSES),
  billing: z.enum(BILLING_STATUSES),
  level: z.enum(STUDENT_LEVELS).optional().or(z.literal("")),
  goal: z.string().trim().max(300).optional().or(z.literal("")),
});

export type StudentFormInput = z.infer<typeof studentFormSchema>;

/** How a student usually pays. Transfer first: it is the common case. */
export const PAY_METHODS = ["TRANSFER", "STRIPE", "CASH"] as const;

export const PAY_METHOD_LABELS: Record<(typeof PAY_METHODS)[number], string> = {
  TRANSFER: "Transfer",
  STRIPE: "Stripe",
  CASH: "Cash",
};

export const quickEditSchema = z.discriminatedUnion("field", [
  z.object({
    id: z.string().min(1),
    field: z.literal("billing"),
    value: z.enum(BILLING_STATUSES),
  }),
  z.object({
    id: z.string().min(1),
    field: z.literal("status"),
    value: z.enum(STUDENT_STATUSES),
  }),
  z.object({
    id: z.string().min(1),
    field: z.literal("level"),
    // Empty clears the level: "not set" is a real answer, not a missing one.
    value: z.enum(STUDENT_LEVELS).or(z.literal("")),
  }),
  z.object({
    id: z.string().min(1),
    field: z.literal("payMethod"),
    value: z.enum(PAY_METHODS).or(z.literal("")),
  }),
  z.object({
    id: z.string().min(1),
    field: z.literal("email"),
    // Same rule as the form: a real address, or nothing at all.
    value: z.string().trim().email("Enter a valid email").or(z.literal("")),
  }),
  z.object({
    id: z.string().min(1),
    field: z.literal("phone"),
    value: z.string().trim().max(30),
  }),
  z.object({
    id: z.string().min(1),
    field: z.literal("goal"),
    value: z.string().trim().max(300),
  }),
  z.object({
    id: z.string().min(1),
    field: z.literal("firstName"),
    // The one field that cannot be emptied: a record with no name is unfindable.
    value: z.string().trim().min(1, "A first name is required").max(60),
  }),
  z.object({
    id: z.string().min(1),
    field: z.literal("lastName"),
    value: z.string().trim().max(60),
  }),
  z.object({
    id: z.string().min(1),
    field: z.literal("modality"),
    value: z.enum(MODALITIES),
  }),
  z.object({
    id: z.string().min(1),
    field: z.literal("languageId"),
    value: z.string().min(1),
  }),
  z.object({
    id: z.string().min(1),
    field: z.literal("primaryTeacherId"),
    // Empty unassigns them, which is a real state — 14 students are in it.
    value: z.string(),
  }),
]);

export type QuickEditInput = z.infer<typeof quickEditSchema>;
