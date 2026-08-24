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
import { InitialsAvatar } from "@/components/shared/identity";
import { formatAmount, formatHours, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "../money";
import { savePayout, settlePayout } from "../actions";
import type { TeacherPeriod } from "../queries";

/**
 * Who has been paid for this period, and who has not.
 *
 * The hours come from completed classes and cannot be edited here — they are
 * what the calendar says was taught. The amount is typed in, because DARPE
 * already knows its own rates and the rule for a cancelled class is not settled
 * yet. What the product contributes is the record of settlement.
 */
export function PayoutsPanel({
  periods,
  periodStart,
  periodEnd,
  today,
}: {
  periods: TeacherPeriod[];
  periodStart: string;
  periodEnd: string;
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
    <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
      {periods.map((period) => (
        <li key={period.teacherId} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <InitialsAvatar name={period.teacherName} />

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{period.teacherName}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {period.load.classes === 0
                ? "No classes completed in this period"
                : `${period.load.classes} classes · ${formatHours(period.load.minutes)} · ` +
                  `${period.load.individualClasses} individual, ${period.load.groupClasses} group`}
            </span>
          </span>

          {period.payout ? (
            <>
              <span className="text-sm font-medium tabular-nums">
                {formatAmount(period.payout.amountCents, period.payout.currency)}
              </span>

              {period.payout.paidOn ? (
                <>
                  <Badge variant="default">
                    Paid {period.payout.paidOn}
                    {period.payout.method
                      ? ` · ${PAYMENT_METHOD_LABELS[period.payout.method]}`
                      : ""}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Mark ${period.teacherName} as unpaid`}
                    disabled={pendingId === period.payout.id}
                    onClick={() => handleSettle(period.payout!.id, false, "CASH")}
                  >
                    <Undo2 className="size-4" />
                  </Button>
                </>
              ) : (
                <MarkPaid
                  disabled={pendingId === period.payout.id}
                  onConfirm={(method) => handleSettle(period.payout!.id, true, method)}
                />
              )}
            </>
          ) : (
            <span className="flex items-center gap-2">
              <Input
                aria-label={`Amount owed to ${period.teacherName}`}
                inputMode="decimal"
                placeholder="Amount"
                className="w-28"
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
          )}
        </li>
      ))}
    </ul>
  );
}

/** Choosing how a teacher was paid, then confirming — two clicks, not one. */
function MarkPaid({
  disabled,
  onConfirm,
}: {
  disabled: boolean;
  onConfirm: (method: string) => void;
}) {
  const [method, setMethod] = useState("TRANSFER");

  return (
    <span className="flex items-center gap-2">
      <Label className="sr-only" htmlFor="payout-method">
        How they were paid
      </Label>
      <Select
        items={PAYMENT_METHODS.map((value) => ({
          label: PAYMENT_METHOD_LABELS[value],
          value,
        }))}
        value={method}
        onValueChange={(value) => value !== null && setMethod(value)}
      >
        <SelectTrigger id="payout-method" className="w-32">
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
        <Check className="size-4" /> Mark paid
      </Button>
    </span>
  );
}
