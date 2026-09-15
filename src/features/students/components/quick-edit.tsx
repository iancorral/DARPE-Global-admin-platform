"use client";

import { Badge } from "@/components/ui/badge";
import { InlineSelect } from "@/components/shared/inline-field";
import { cn } from "@/lib/utils";
import { TONE_CLASSES } from "@/lib/tone";
import { quickEditStudent } from "../actions";
import {
  BILLING_STATUSES,
  BILLING_STATUS_LABELS,
  PAY_METHODS,
  PAY_METHOD_LABELS,
  STUDENT_LEVELS,
  STUDENT_STATUSES,
  STUDENT_STATUS_LABELS,
  asStudentLevel,
} from "../schemas";
import { statusChip } from "../status-chip";
import type { BillingStatus, PaymentMethod, StudentStatus } from "@/generated/prisma/client";

/**
 * The three student cells that are edited straight from a list.
 *
 * Thin wrappers over `InlineSelect` — the behaviour (optimistic, one write, an
 * error toast on refusal) lives there and is shared with teachers and groups.
 * What is here is only what makes a *student* cell: which options it offers and
 * what the closed chip looks like.
 */
const NEUTRAL_CHIP = "border-border bg-muted text-muted-foreground";

/** A pill that reads as set or unset, used for level and payment method. */
function Pill({ filled, children }: { filled: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 cursor-pointer items-center rounded-full border px-2.5 text-xs font-medium",
        "transition-[filter,box-shadow] hover:shadow-xs hover:brightness-[0.97]",
        "motion-reduce:transition-none",
        filled
          ? "border-border bg-card text-foreground"
          : "border-dashed border-border bg-transparent text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}

/**
 * A student's one status chip.
 *
 * The list shows a single label — paid, pending, inactive — and that label is
 * two fields underneath. The menu offers both: billing states first, then the
 * lifecycle. Picking a billing state also reactivates a paused student, because
 * marking somebody "Paid" must not leave them hidden from the list.
 */
export function StatusCell({
  studentId,
  status,
  billing,
}: {
  studentId: string;
  status: StudentStatus;
  billing: BillingStatus;
}) {
  const chip = statusChip(status, billing);

  return (
    <InlineSelect
      value={status === "ACTIVE" ? billing : status}
      label="Change status"
      items={[
        ...BILLING_STATUSES.map((b) => ({ label: BILLING_STATUS_LABELS[b], value: b })),
        ...STUDENT_STATUSES.filter((s) => s !== "ACTIVE").map((s) => ({
          label: STUDENT_STATUS_LABELS[s],
          value: s,
        })),
      ]}
      save={async (next) => {
        if ((STUDENT_STATUSES as readonly string[]).includes(next)) {
          return quickEditStudent({
            id: studentId,
            field: "status",
            value: next as StudentStatus,
          });
        }

        if (status !== "ACTIVE") {
          const back = await quickEditStudent({
            id: studentId,
            field: "status",
            value: "ACTIVE",
          });
          if (!back.success) return back;
        }

        return quickEditStudent({
          id: studentId,
          field: "billing",
          value: next as BillingStatus,
        });
      }}
      render={() => (
        <Badge
          variant="outline"
          className={cn(
            "cursor-pointer",
            chip.tone ? TONE_CLASSES[chip.tone].chip : NEUTRAL_CHIP
          )}
        >
          {chip.label}
        </Badge>
      )}
    />
  );
}

/** The CEFR level. "Not set" is one of the choices, not a missing value. */
export function LevelCell({
  studentId,
  level,
}: {
  studentId: string;
  level: string | null;
}) {
  return (
    <InlineSelect
      value={asStudentLevel(level)}
      label="Change level"
      items={[
        { label: "Not set", value: "" },
        ...STUDENT_LEVELS.map((l) => ({ label: l, value: l })),
      ]}
      save={(value) =>
        quickEditStudent({
          id: studentId,
          field: "level",
          value: value as (typeof STUDENT_LEVELS)[number] | "",
        })
      }
      render={({ value }) => (
        <Pill filled={Boolean(value)}>{value || "Set"}</Pill>
      )}
    />
  );
}

/** How the student usually pays. */
export function PayMethodCell({
  studentId,
  payMethod,
}: {
  studentId: string;
  payMethod: PaymentMethod | null;
}) {
  return (
    <InlineSelect
      value={payMethod ?? ""}
      label="Change payment method"
      items={[
        { label: "Not set", value: "" },
        ...PAY_METHODS.map((method) => ({
          label: PAY_METHOD_LABELS[method],
          value: method,
        })),
      ]}
      save={(value) =>
        quickEditStudent({
          id: studentId,
          field: "payMethod",
          value: value as (typeof PAY_METHODS)[number] | "",
        })
      }
      render={({ value, label }) => (
        <Pill filled={Boolean(value)}>{label ?? "Set"}</Pill>
      )}
    />
  );
}
