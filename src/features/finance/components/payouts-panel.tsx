"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { InitialsAvatar } from "@/components/shared/identity";
import { TONE_CLASSES } from "@/lib/tone";
import { formatAmount, formatHours, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "../money";
import { savePayout, settlePayout } from "../actions";
import type { TeacherPeriod } from "../queries";

/**
 * Who has been paid for this period, and who has not.
 *
 * The hours come from completed classes and cannot be edited here — they are
 * what the calendar says was taught. The amount is typed in, because DARPE pays
 * per finished course and staff already know their own figures. What the
 * product contributes is the record of settlement.
 *
 * A teacher with no classes still gets a row: a zero is how staff know the
 * period was checked rather than forgotten.
 */
export function PayoutsPanel({
  periods,
  periodStart,
  periodEnd,
  periodLabel,
  today,
}: {
  periods: TeacherPeriod[];
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  today: string;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleSaveAmount(teacherId: string) {
    const amount = drafts[teacherId] ?? "";
    if (!amount) return;

    setPendingId(teacherId);
    try {
      const result = await savePayout({
        teacherId,
        periodStart,
        periodEnd,
        amount,
        currency: "MXN",
        notes: "",
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Amount saved");
      setDrafts((current) => ({ ...current, [teacherId]: "" }));
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function handleSettle(payoutId: string, paid: boolean, method: string) {
    setPendingId(payoutId);
    try {
      const result = await settlePayout({
        id: payoutId,
        paidOn: paid ? today : null,
        method: paid ? (method as "CASH" | "STRIPE" | "TRANSFER") : null,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(paid ? "Marked as paid" : "Marked as unpaid");
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <DataTable
      rows={periods}
      getKey={(period) => period.teacherId}
      columns={[
        {
          key: "teacher",
          header: "Teacher",
          cell: (period) => (
            <span className="flex items-center gap-3 font-medium">
              <InitialsAvatar name={period.teacherName} className="size-8" />
              <span className="truncate">{period.teacherName}</span>
            </span>
          ),
        },
        {
          key: "period",
          header: "Period",
          width: "14%",
          cell: () => <span className="text-muted-foreground">{periodLabel}</span>,
        },
        {
          key: "hours",
          header: "Hours",
          width: "9%",
          align: "right",
          cell: (period) =>
            period.load.classes === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              formatHours(period.load.minutes)
            ),
        },
        {
          key: "classes",
          header: "Classes",
          width: "20%",
          cell: (period) => (
            <span className="text-muted-foreground">
              {period.load.classes === 0
                ? "None completed"
                : `${period.load.individualClasses} individual · ${period.load.groupClasses} group`}
            </span>
          ),
        },
        {
          key: "amount",
          header: "Amount",
          width: "17%",
          align: "right",
          interactive: true,
          cell: (period) =>
            period.payout ? (
              <span className="font-medium">
                {formatAmount(period.payout.amountCents, period.payout.currency)}
              </span>
            ) : (
              <span className="flex items-center justify-end gap-2">
                <Input
                  aria-label={`Amount owed to ${period.teacherName}`}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="h-8 w-24 text-right"
                  value={drafts[period.teacherId] ?? ""}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [period.teacherId]: event.target.value,
                    }))
                  }
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendingId === period.teacherId || !drafts[period.teacherId]}
                  onClick={() => handleSaveAmount(period.teacherId)}
                >
                  Save
                </Button>
              </span>
            ),
        },
        {
          key: "status",
          header: "Status",
          width: "18%",
          interactive: true,
          cell: (period) => {
            const payout = period.payout;

            if (!payout) return <span className="text-xs text-muted-foreground">Not set</span>;

            return payout.paidOn ? (
              <span className="flex items-center gap-1.5">
                <Badge variant="outline" className={TONE_CLASSES.teal.chip}>
                  Paid {payout.paidOn}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Mark ${period.teacherName} as unpaid`}
                  disabled={pendingId === payout.id}
                  onClick={() => handleSettle(payout.id, false, "CASH")}
                >
                  <Undo2 className="size-4" />
                </Button>
              </span>
            ) : (
              <MarkPaid
                teacherName={period.teacherName}
                disabled={pendingId === payout.id}
                onConfirm={(method) => handleSettle(payout.id, true, method)}
              />
            );
          },
        },
      ]}
      empty={<EmptyState>No active teachers yet.</EmptyState>}
      footer="Hours come from completed classes and cannot be edited here. DARPE pays per finished course, so the amount is entered by hand."
    />
  );
}

/** Choosing how a teacher was paid, then confirming — two clicks, not one. */
function MarkPaid({
  teacherName,
  disabled,
  onConfirm,
}: {
  teacherName: string;
  disabled: boolean;
  onConfirm: (method: string) => void;
}) {
  const [method, setMethod] = useState("TRANSFER");

  return (
    <span className="flex items-center gap-2">
      <Label className="sr-only">How {teacherName} was paid</Label>
      <Select
        items={PAYMENT_METHODS.map((value) => ({
          label: PAYMENT_METHOD_LABELS[value],
          value,
        }))}
        value={method}
        onValueChange={(value) => value !== null && setMethod(value)}
      >
        <SelectTrigger className="h-8 w-28" aria-label={`How ${teacherName} was paid`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_METHODS.map((value) => (
            <SelectItem key={value} value={value}>
              {PAYMENT_METHOD_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" disabled={disabled} onClick={() => onConfirm(method)}>
        <Check className="size-4" /> Pay
      </Button>
    </span>
  );
}
