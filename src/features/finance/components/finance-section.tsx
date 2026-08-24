import Link from "next/link";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { DashboardCard } from "@/components/shared/page";
import { cn } from "@/lib/utils";
import { formatMoney, revenueChangePercent, type FinanceSnapshot } from "../snapshot";
import { RevenueChart } from "./revenue-chart";

/**
 * The dashboard's money panel — a preview, not the finance screen.
 *
 * Deliberately knows nothing about where the figures came from: it renders a
 * `FinanceSnapshot`. Every figure is money actually received — a month with no
 * payments shows zero, which is true, rather than a placeholder.
 */
export function FinanceSection({ snapshot }: { snapshot: FinanceSnapshot | null }) {
  if (!snapshot) {
    return (
      <DashboardCard title="Money" description="Not set up yet">
        <p className="text-sm text-muted-foreground">
          This database has no payment records yet. Run the pending migration and money
          will appear here as soon as the first payment is recorded.
        </p>
      </DashboardCard>
    );
  }

  const change = revenueChangePercent(snapshot);
  const summary =
    `${snapshot.currentMonthLabel}: ` +
    `${formatMoney(snapshot.currentMonthRevenueCents, snapshot.currency)} revenue` +
    (change === null
      ? ""
      : `, ${change >= 0 ? "up" : "down"} ${Math.abs(change)}% on the previous month`) +
    `. Owed to teachers ${formatMoney(snapshot.outstandingCents, snapshot.currency)}` +
    (snapshot.outstandingCount === null
      ? ""
      : ` across ${snapshot.outstandingCount} unpaid ${
          snapshot.outstandingCount === 1 ? "payout" : "payouts"
        }`) +
    `. Monthly revenue: ` +
    snapshot.monthlyRevenue
      .map((point) => `${point.label} ${formatMoney(point.amountCents, snapshot.currency)}`)
      .join(", ") +
    ".";

  return (
    <DashboardCard
      title="Money"
      description={`${snapshot.currency} · last ${snapshot.monthlyRevenue.length} months`}
      action={
        <Link
          href="/finance"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Finance <ChevronRight aria-hidden="true" className="size-3.5" />
        </Link>
      }
    >
      <figure className="m-0">
        <figcaption className="sr-only">{summary}</figcaption>

        <p className="font-serif text-2xl font-semibold tracking-tight">
          {formatMoney(snapshot.currentMonthRevenueCents, snapshot.currency)}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{snapshot.currentMonthLabel}</span>
          {change !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                change >= 0 ? "text-tone-teal-fg" : "text-tone-rose-fg"
              )}
            >
              {change >= 0 ? (
                <TrendingUp aria-hidden="true" className="size-3.5" />
              ) : (
                <TrendingDown aria-hidden="true" className="size-3.5" />
              )}
              {Math.abs(change)}% on last month
            </span>
          )}
        </div>

        <div className="mt-3">
          <RevenueChart points={snapshot.monthlyRevenue} currency={snapshot.currency} />
        </div>

        <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
          Owed to teachers{" "}
          <span className="font-medium text-foreground">
            {formatMoney(snapshot.outstandingCents, snapshot.currency)}
          </span>
          {snapshot.outstandingCount !== null && (
            <>
              {" "}
              · {snapshot.outstandingCount} unpaid{" "}
              {snapshot.outstandingCount === 1 ? "payout" : "payouts"}
            </>
          )}
        </p>
      </figure>
    </DashboardCard>
  );
}
