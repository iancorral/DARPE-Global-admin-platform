import { AlertCircle, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Section } from "@/components/shared/page";
import { Badge } from "@/components/ui/badge";
import { formatMoney, revenueChangePercent, type FinanceSnapshot } from "../snapshot";
import { RevenueChart } from "./revenue-chart";

/**
 * The dashboard's money overview.
 *
 * Deliberately knows nothing about where the figures came from: it renders a
 * `FinanceSnapshot`, whether that came from today's demo fixture or from real
 * records later. `null` means finance is not configured, which is the honest
 * state until DARPE records money — not an error and not a zero.
 */
export function FinanceSection({ snapshot }: { snapshot: FinanceSnapshot | null }) {
  if (!snapshot) {
    return (
      <Section
        title="Finance"
        description="Revenue and outstanding balances, once DARPE records them."
      >
        <EmptyState>
          Finance is not set up yet. Recording payments needs a few business decisions
          first — how students are charged, and when a payment counts as revenue.
        </EmptyState>
      </Section>
    );
  }

  const change = revenueChangePercent(snapshot);
  const summary =
    `${snapshot.currentMonthLabel}: ` +
    `${formatMoney(snapshot.currentMonthRevenueCents, snapshot.currency)} revenue` +
    (change === null
      ? ""
      : `, ${change >= 0 ? "up" : "down"} ${Math.abs(change)}% on the previous month`) +
    `. Outstanding ${formatMoney(snapshot.outstandingCents, snapshot.currency)}` +
    (snapshot.outstandingCount === null
      ? ""
      : ` across ${snapshot.outstandingCount} ${
          snapshot.outstandingCount === 1 ? "item" : "items"
        }`) +
    `. Monthly revenue: ` +
    snapshot.monthlyRevenue
      .map((point) => `${point.label} ${formatMoney(point.amountCents, snapshot.currency)}`)
      .join(", ") +
    ".";

  return (
    <Section
      title="Finance"
      description={`Revenue and outstanding balances · ${snapshot.currency}`}
      actions={
        snapshot.isSample ? (
          // Unmissable wherever these figures appear: none of them are real.
          <Badge variant="outline" className="border-tone-amber-line bg-tone-amber text-tone-amber-fg">
            Sample data
          </Badge>
        ) : undefined
      }
    >
      {snapshot.isSample && (
        <p className="mb-3 text-xs text-muted-foreground">
          These figures are invented placeholders for reviewing the layout. DARPE records
          no financial data yet.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-t-2 border-t-tone-teal-fg bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp aria-hidden="true" className="size-3.5" />
            Revenue · {snapshot.currentMonthLabel}
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold tracking-tight">
            {formatMoney(snapshot.currentMonthRevenueCents, snapshot.currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {change === null
              ? "No previous month to compare"
              : `${change >= 0 ? "Up" : "Down"} ${Math.abs(change)}% on last month`}
          </p>
        </div>

        <div className="rounded-xl border border-t-2 border-t-tone-amber-fg bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertCircle aria-hidden="true" className="size-3.5" />
            Outstanding
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold tracking-tight">
            {formatMoney(snapshot.outstandingCents, snapshot.currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {snapshot.outstandingCount === null
              ? "Awaiting payment"
              : `${snapshot.outstandingCount} unpaid ${
                  snapshot.outstandingCount === 1 ? "item" : "items"
                }`}
          </p>
        </div>
      </div>

      <figure className="m-0 mt-4 rounded-xl border bg-card p-4">
        <figcaption className="mb-2 text-xs text-muted-foreground">
          Monthly revenue · last {snapshot.monthlyRevenue.length} months
          <span className="sr-only">. {summary}</span>
        </figcaption>
        <RevenueChart points={snapshot.monthlyRevenue} currency={snapshot.currency} />
      </figure>
    </Section>
  );
}
