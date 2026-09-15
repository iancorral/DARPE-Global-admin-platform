import { AlertCircle, TrendingUp } from "lucide-react";
import { getFinanceOverview, getPayableStudents } from "@/features/finance/queries";
import { RecordPayment } from "@/features/finance/components/record-payment";
import { MonthPager } from "@/features/finance/components/month-pager";
import { selectedMonthStart } from "@/features/finance/months";
import { dashboardWindows } from "@/features/dashboard/windows";
import { DEFAULT_TIMEZONE, todayInZone } from "@/lib/datetime";
import { MigrationPending } from "@/features/finance/components/migration-pending";
import { isMissingTable } from "@/lib/db-errors";
import { formatAmount, formatTotals, PAYMENT_METHOD_LABELS } from "@/features/finance/money";
import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer, PageHeader, Section } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const today = todayInZone(DEFAULT_TIMEZONE);

  /*
   * Which month the screen is showing lives in the address, like the calendar's
   * week. Nothing else has to hold it, Back works, and a closed month can be
   * sent to somebody as a link.
   */
  const requested = Array.isArray(params.month) ? params.month[0] : params.month;
  const monthStart = selectedMonthStart(
    requested,
    dashboardWindows(new Date(), DEFAULT_TIMEZONE).monthStartDate
  );

  let overview: Awaited<ReturnType<typeof getFinanceOverview>>;
  let students: Awaited<ReturnType<typeof getPayableStudents>>;
  try {
    [overview, students] = await Promise.all([
      getFinanceOverview({ monthStart }),
      getPayableStudents(),
    ]);
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    return <MigrationPending title="Finance" />;
  }

  // Only the peso figures drive the bar heights: mixing currencies into one
  // scale would draw a shape that means nothing.
  const pesoByMonth = overview.monthly.map((month) => ({
    ...month,
    pesos: month.totals.find((total) => total.currency === "MXN")?.amountCents ?? 0,
    isSelected: month.monthStart === overview.monthStartDate,
  }));
  const tallest = Math.max(1, ...pesoByMonth.map((month) => month.pesos));
  const hasHistory = pesoByMonth.some((month) => month.totals.length > 0);

  return (
    <PageContainer>
      <PageHeader
        title="Finance"
        description={`Money received · ${overview.monthLabel}`}
        actions={
          <>
            <MonthPager
              label={overview.monthLabel}
              previous={overview.previousMonthStart}
              next={overview.nextMonthStart}
              isCurrentMonth={overview.isCurrentMonth}
            />
            <RecordPayment students={students} defaultDate={today} />
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-t-2 border-t-tone-teal-fg bg-card p-4 shadow-xs">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp aria-hidden="true" className="size-3.5" />
            Received in {overview.monthNameLabel}
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold tracking-tight">
            {formatTotals(overview.monthReceived)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {overview.paymentCount} {overview.paymentCount === 1 ? "payment" : "payments"} ·
            month before {formatTotals(overview.previousMonthReceived)}
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
          {/*
            Does not follow the month pager: what is still owed is a fact about
            today, whatever period the payouts belong to.
          */}
          <p className="mt-1 text-xs text-muted-foreground">
            {overview.unpaidPayouts.length} unpaid{" "}
            {overview.unpaidPayouts.length === 1 ? "payout" : "payouts"}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <Section
          title="Received by month"
          description={`Pesos, six months to ${overview.monthLabel}`}
        >
          {!hasHistory ? (
            <EmptyState>
              No payments in these six months.
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
                          className={cn(
                            "darpe-bar-grow w-full rounded-t-md bg-tone-teal-solid",
                            // The month being read is the solid one; the five
                            // behind it are context, not the subject.
                            !month.isSelected && "opacity-45"
                          )}
                          style={{
                            height: `${(month.pesos / tallest) * 100}%`,
                            animationDelay: `${index * 60}ms`,
                          }}
                        />
                      ) : (
                        <span aria-hidden="true" className="h-1 w-full rounded-sm bg-border" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "mt-1.5 truncate text-center text-[11px]",
                        month.isSelected
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
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

        <Section title="How the money arrived" description={overview.monthLabel}>
          {overview.byMethod.length === 0 ? (
            <EmptyState tone="compact">
              Nothing received in {overview.monthNameLabel}.
            </EmptyState>
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

        <p className="text-xs text-muted-foreground">
          Payments count toward the month they were received.
        </p>
      </div>
    </PageContainer>
  );
}
