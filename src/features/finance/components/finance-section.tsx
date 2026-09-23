import Link from "next/link";
import { ArrowRight, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
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
 *
 * Laid out as a column that fills its cell, so it matches the height of the
 * activity chart beside it: the month's figure on top, six months under it,
 * and what is owed to teachers pinned to the bottom as its own row — the
 * shape Stripe's home uses for "gross volume" above "payouts".
 */
export function FinanceSection({
  snapshot,
  className,
}: {
  snapshot: FinanceSnapshot | null;
  className?: string;
}) {
  if (!snapshot) {
    return (
      <DashboardCard title="Money" description="Not set up yet" className={className}>
        <p className="text-sm text-muted-foreground">
          This database has no payment records yet. Run the pending migration and money
          will appear here as soon as the first payment is recorded.
        </p>
      </DashboardCard>
    );
  }

  const change = revenueChangePercent(snapshot);
  const hasMoney = snapshot.monthlyRevenue.some((point) => point.amountCents > 0);
  const summary =
    `${snapshot.currentMonthLabel}: ` +
    `${formatMoney(snapshot.currentMonthRevenueCents, snapshot.currency)} revenue` +
    (change === null
      ? ""
      : `, ${change >= 0 ? "up" : "down"} ${Math.abs(change)}% on the previous month`) +
    `. Owed to teachers ${formatMoney(snapshot.outstandingCents, snapshot.currency)}` +
    (snapshot.outstandingCount === null
      ? ""
      : ` across ${snapshot.outstandingCount} ${
          snapshot.outstandingCount === 1 ? "teacher" : "teachers"
        }`) +
    `. Monthly revenue: ` +
    snapshot.monthlyRevenue
      .map((point) => `${point.label} ${formatMoney(point.amountCents, snapshot.currency)}`)
      .join(", ") +
    ".";

  return (
    <DashboardCard
      title="Money"
      description={`Received in ${snapshot.currentMonthLabel}`}
      action={
        <Link
          href="/finance"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Finance <ChevronRight aria-hidden="true" className="size-3.5" />
        </Link>
      }
      className={cn("flex flex-col", className)}
      bodyClassName="flex flex-1 flex-col p-0"
    >
      <figure className="m-0 flex flex-1 flex-col">
        <figcaption className="sr-only">{summary}</figcaption>

        <div className="px-5">
          <p className="font-serif text-3xl leading-none font-semibold tracking-tight">
            {formatMoney(snapshot.currentMonthRevenueCents, snapshot.currency)}
          </p>
          {change !== null && (
            <p
              className={cn(
                "mt-1.5 inline-flex items-center gap-1 text-xs font-medium",
                change >= 0 ? "text-tone-teal-fg" : "text-tone-rose-fg"
              )}
            >
              {change >= 0 ? (
                <TrendingUp aria-hidden="true" className="size-3.5" />
              ) : (
                <TrendingDown aria-hidden="true" className="size-3.5" />
              )}
              {Math.abs(change)}% on last month
            </p>
          )}
        </div>

        {/*
          A line of zeroes is not a chart — it drew a flat rule along the bottom
          of an empty box and read as a rendering fault. Until there is money,
          the six months show as their own empty columns, so the panel already
          has the shape it will have and says plainly that nothing is in it.
        */}
        <div className="flex flex-1 flex-col justify-end px-5 pt-4 pb-4">
          {hasMoney ? (
            <RevenueChart points={snapshot.monthlyRevenue} currency={snapshot.currency} />
          ) : (
            <div>
              <div aria-hidden="true" className="flex h-20 items-end gap-2">
                {snapshot.monthlyRevenue.map((point, index) => (
                  <div key={point.label} className="flex flex-1 flex-col items-center gap-1.5">
                    <span
                      className={cn(
                        "h-1 w-full rounded-full",
                        index === snapshot.monthlyRevenue.length - 1
                          ? "bg-primary/30"
                          : "bg-muted"
                      )}
                    />
                    <span className="text-[10px] text-muted-foreground">{point.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                No payments recorded yet
              </p>
            </div>
          )}
        </div>

        <Link
          href="/payments?tab=payouts"
          className="group flex items-center justify-between gap-3 border-t bg-muted/30 px-5 py-3 transition-colors hover:bg-muted/60 motion-reduce:transition-none"
        >
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">Owed to teachers</span>
            <span className="block text-sm font-semibold tabular-nums">
              {formatMoney(snapshot.outstandingCents, snapshot.currency)}
              {snapshot.outstandingCount !== null && snapshot.outstandingCount > 0 && (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {snapshot.outstandingCount}{" "}
                  {snapshot.outstandingCount === 1 ? "teacher" : "teachers"}
                </span>
              )}
            </span>
          </span>
          <ArrowRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      </figure>
    </DashboardCard>
  );
}
