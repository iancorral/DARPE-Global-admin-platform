"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { InitialsAvatar } from "@/components/shared/identity";
import { TONE_CLASSES } from "@/lib/tone";
import { formatAmount, formatHours, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "../money";
import { payTeacherWeek, settlePayout } from "../actions";
import type { TeacherPayWeekRow } from "../queries";

type Method = "CASH" | "STRIPE" | "TRANSFER";

/**
 * What each teacher is owed for one week, and paying them.
 *
 * Worked out, not typed: every completed class at DARPE's rate, with the
 * breakdown one click away so a teacher's question — "why $1,540?" — is
 * answered by the list of classes. Paying records the amount and the day; a
 * class completed after paying shows as a difference to settle.
 *
 * Teachers with nothing that week share one line at the bottom rather than a
 * row each: the week was checked, and a column of zeros would bury the people
 * who actually need paying.
 */
export function PayoutsPanel({
  rows,
  weekStart,
}: {
  rows: TeacherPayWeekRow[];
  weekStart: string;
}) {
  const teaching = rows.filter((row) => row.lines.length > 0);
  const idle = rows.filter((row) => row.lines.length === 0);

  return (
    <div className="space-y-3">
      {teaching.length === 0 ? (
        <EmptyState>No completed classes this week.</EmptyState>
      ) : (
        teaching.map((row) => <TeacherPay key={row.teacherId} row={row} weekStart={weekStart} />)
      )}

      {idle.length > 0 && (
        <p className="text-xs text-muted-foreground">
          No completed classes: {idle.map((row) => row.teacherName).join(", ")}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Completed classes only. Individual $200 an hour · group $170 an hour for two
        students, $10 more for each extra student, up to $200.
      </p>
    </div>
  );
}

function TeacherPay({ row, weekStart }: { row: TeacherPayWeekRow; weekStart: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<Method>(row.payout?.method ?? "TRANSFER");

  const paid = row.payout?.paidOn ? row.payout : null;
  const changedSincePaid = paid !== null && paid.amountCents !== row.amountCents;

  function pay() {
    startTransition(async () => {
      const result = await payTeacherWeek({ teacherId: row.teacherId, weekStart, method });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${row.teacherName} marked as paid`);
      router.refresh();
    });
  }

  function undo(payoutId: string) {
    startTransition(async () => {
      const result = await settlePayout({ id: payoutId, paidOn: null, method: null });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Marked as unpaid");
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <InitialsAvatar name={row.teacherName} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{row.teacherName}</p>
          <p className="text-xs text-muted-foreground">
            {row.lines.length} {row.lines.length === 1 ? "class" : "classes"} ·{" "}
            {formatHours(row.minutes)}
          </p>
        </div>

        <p className="font-serif text-xl font-semibold tabular-nums">
          {formatAmount(row.amountCents, "MXN")}
        </p>

        {paid ? (
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={TONE_CLASSES.teal.chip}>
              <Check className="size-3.5" /> Paid {paid.paidOn}
            </Badge>
            {changedSincePaid && (
              <Button size="sm" variant="outline" disabled={pending} onClick={pay}>
                Update to {formatAmount(row.amountCents, "MXN")}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Mark ${row.teacherName} as unpaid`}
              disabled={pending}
              onClick={() => undo(paid.id)}
            >
              <Undo2 className="size-4" />
            </Button>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Select
              items={PAYMENT_METHODS.map((value) => ({
                label: PAYMENT_METHOD_LABELS[value],
                value,
              }))}
              value={method}
              onValueChange={(value) => value !== null && setMethod(value as Method)}
            >
              <SelectTrigger className="h-8 w-28" aria-label={`How ${row.teacherName} is paid`}>
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
            <Button size="sm" disabled={pending} onClick={pay}>
              <Check className="size-4" /> Mark paid
            </Button>
          </span>
        )}
      </div>

      {changedSincePaid && paid && (
        <p className="border-t bg-tone-amber px-4 py-2 text-xs text-tone-amber-fg">
          Paid {formatAmount(paid.amountCents, "MXN")}; the week now comes to{" "}
          {formatAmount(row.amountCents, "MXN")}.
        </p>
      )}

      <details className="border-t">
        <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-primary">
          See classes
        </summary>
        <ul className="divide-y px-4 pb-2">
          {row.lines.map((line) => (
            <li key={line.sessionId} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2 text-sm">
              <span className="w-24 shrink-0 text-muted-foreground tabular-nums">
                {line.dateLabel} · {line.startLabel}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {line.title}
                {line.type === "GROUP" && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {line.students} {line.students === 1 ? "student" : "students"}
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatHours(line.minutes)} × {formatAmount(line.hourlyCents, "MXN")}
              </span>
              <span className="w-24 text-right font-medium tabular-nums">
                {formatAmount(line.amountCents, "MXN")}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
