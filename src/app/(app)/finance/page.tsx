import Link from "next/link";
import { AlertCircle, TrendingUp } from "lucide-react";
import { getFinanceOverview } from "@/features/finance/queries";
import { MigrationPending } from "@/features/finance/components/migration-pending";
import { isMissingTable } from "@/lib/db-errors";
import { formatAmount, formatTotals, PAYMENT_METHOD_LABELS } from "@/features/finance/money";
import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer, PageHeader, Section } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function FinancePage() {
  let overview: Awaited<ReturnType<typeof getFinanceOverview>>;
  try {
    overview = await getFinanceOverview();
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    return <MigrationPending title="Finance" />;
  }

  // Only the peso figures drive the bar heights: mixing currencies into one
  // scale would draw a shape that means nothing.
  const pesoByMonth = overview.monthly.map((month) => ({
    ...month,
    pesos: month.totals.find((total) => total.currency === "MXN")?.amountCents ?? 0,
  }));
  const tallest = Math.max(1, ...pesoByMonth.map((month) => month.pesos));
  const hasHistory = pesoByMonth.some((month) => month.totals.length > 0);

  return (
    <PageContainer>
      <PageHeader
        title="Finance"
        description={`Money received · ${overview.monthLabel}`}
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/payments" />}>
            Record a payment
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-t-2 border-t-tone-teal-fg bg-card p-4 shadow-xs">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp aria-hidden="true" className="size-3.5" />
            Received this month
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold tracking-tight">
            {formatTotals(overview.monthReceived)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {overview.paymentCount} {overview.paymentCount === 1 ? "payment" : "payments"} ·
            last month {formatTotals(overview.previousMonthReceived)}
          </p>
        </div>

        <div className="rounded-xl border border-t-2 border-t-tone-amber-fg bg-card p-4 shadow-xs">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertCircle aria-hidden="true" className="size-3.5" />
            Owed to teachers
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold tracking-tight">
            {formatTotals(
              overview.unpaidPayouts.map((payout) => ({
                amountCents: payout.amountCents,
                currency: payout.currency,
              }))
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {overview.unpaidPayouts.length}{" "}
            {overview.unpaidPayouts.length === 1 ? "payout" : "payouts"} not yet marked paid
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <Section title="Received by month" description="Pesos, last six months">
          {!hasHistory ? (
            <EmptyState>
              No payments recorded yet. Revenue here is money actually received, so this
              fills in as payments are recorded.
            </EmptyState>
          ) : (
            <div className="rounded-xl border bg-card p-5 shadow-xs">
              <div className="flex h-40 items-end gap-3">
                {pesoByMonth.map((month, index) => (
                  <div key={month.monthStart} className="flex min-w-0 flex-1 flex-col">
                    <div className="flex h-32 items-end">
                      {month.pesos > 0 ? (
                        <span
                          aria-hidden="true"
                          className="darpe-bar-grow w-full rounded-t-md bg-tone-teal-solid"
                          style={{
                            height: `${(month.pesos / tallest) * 100}%`,
                            animationDelay: `${index * 60}ms`,
                          }}
                        />
                      ) : (
                        <span aria-hidden="true" className="h-1 w-full rounded-sm bg-border" />
                      )}
                    </div>
                    <span className="mt-1.5 truncate text-center text-[11px] text-muted-foreground">
                      {month.label}
                    </span>
                    <span
                      className={cn(
                        "truncate text-center text-[11px] tabular-nums",
                        month.pesos > 0 ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {Math.round(month.pesos / 100).toLocaleString("en-US")}
                    </span>
                  </div>
                ))}
              </div>
              <p className="sr-only">
                {pesoByMonth
                  .map((month) => `${month.label}: ${formatTotals(month.totals)}`)
                  .join(". ")}
              </p>
            </div>
          )}
        </Section>

        <Section title="How the money arrived" description="This month">
          {overview.byMethod.length === 0 ? (
            <EmptyState tone="compact">Nothing received this month yet.</EmptyState>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
              {overview.byMethod.map((entry) => (
                <li
                  key={entry.method}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <span className="text-sm">{PAYMENT_METHOD_LABELS[entry.method]}</span>
                  <span className="text-sm font-medium tabular-nums">
                    {formatTotals(entry.totals)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {overview.unpaidPayouts.length > 0 && (
          <Section title="Payouts still owed">
            <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
              {overview.unpaidPayouts.map((payout) => (
                <li key={payout.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {payout.teacherName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {payout.periodStart} to {payout.periodEnd}
                    </span>
                  </span>
                  <Badge variant="outline">Unpaid</Badge>
                  <span className="text-sm font-medium tabular-nums">
                    {formatAmount(payout.amountCents, payout.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Revenue is counted when the money arrives, not when a class is taught. There is no
          &ldquo;outstanding from students&rdquo; figure because what each student owes, and
          when, has not been defined yet.
        </p>
      </div>
    </PageContainer>
  );
}
