"use client";

import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { InitialsAvatar, LanguageChip } from "@/components/shared/identity";
import { PayMethodCell, StatusCell } from "@/features/students/components/quick-edit";
import { formatAmount } from "../money";
import type { StudentBillingRow } from "../queries";

/**
 * What every studying student is on, and whether they have paid.
 *
 * There are no invoice numbers or due dates here, because DARPE issues no
 * invoices: a student's amount is the list price of the plan they are on. The
 * column is labelled "Course" rather than "Owes" for the same reason — some
 * students are on the price they started at, and the app has no way to know.
 *
 * The status chip is the same control as on the students list, so marking a
 * course paid is one click from wherever staff happen to be looking.
 */
export function StudentBillingTable({ rows }: { rows: StudentBillingRow[] }) {
  return (
    <DataTable
      rows={rows}
      getKey={(row) => row.id}
      href={(row) => `/students/${row.id}`}
      columns={[
        {
          key: "name",
          header: "Student",
          cell: (row) => (
            <span className="flex items-center gap-3 font-medium">
              <InitialsAvatar name={row.name} className="size-8" />
              <span className="truncate group-hover:underline">{row.name}</span>
            </span>
          ),
        },
        {
          key: "language",
          header: "Language",
          width: "14%",
          cell: (row) => <LanguageChip name={row.languageName} />,
        },
        {
          key: "plan",
          header: "Plan",
          width: "17%",
          cell: (row) => <span className="text-muted-foreground">{row.planLabel}</span>,
        },
        {
          key: "course",
          header: "Course",
          width: "14%",
          align: "right",
          cell: (row) => (
            <span className="font-medium">{formatAmount(row.priceCents, row.currency)}</span>
          ),
        },
        {
          // The teacher lives on the students list; this screen is about money,
          // and how somebody pays is what staff actually need beside an amount.
          key: "method",
          header: "Pays by",
          width: "13%",
          interactive: true,
          cell: (row) => <PayMethodCell studentId={row.id} payMethod={row.payMethod} />,
        },
        {
          key: "status",
          header: "Status",
          width: "15%",
          interactive: true,
          cell: (row) => (
            <StatusCell studentId={row.id} status={row.status} billing={row.billing} />
          ),
        },
      ]}
      card={(row) => (
        <>
          <InitialsAvatar name={row.name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{row.name}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
              <LanguageChip name={row.languageName} />
              <span className="truncate">{row.planLabel}</span>
            </span>
          </span>
          <span className="shrink-0 text-sm font-medium tabular-nums">
            {formatAmount(row.priceCents, row.currency)}
          </span>
        </>
      )}
      empty={<EmptyState>No students on a course yet.</EmptyState>}
      footer="Amounts are DARPE's list price for each plan, not a bill. Students on their original rate are not reflected here."
    />
  );
}
