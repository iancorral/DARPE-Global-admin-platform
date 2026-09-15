import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { monthParam } from "../months";

/**
 * Moving the finance screen a month at a time.
 *
 * Links, for the same reason the calendar's week pager is: navigation must not
 * be able to end up stuck behind a pending flag, and an address for a month
 * means staff can bookmark one or send it to somebody.
 *
 * An end of the range renders as a **disabled-looking span rather than a link**,
 * because there genuinely is nowhere to go: no payment was ever recorded before
 * the first month, and next month's income does not exist yet. That is a fact
 * about the data, so showing it is better than a link into an empty page.
 */
export function MonthPager({
  label,
  previous,
  next,
  isCurrentMonth,
}: {
  label: string;
  previous: string | null;
  next: string | null;
  isCurrentMonth: boolean;
}) {
  const edge = cn(
    buttonVariants({ variant: "outline", size: "icon" }),
    "pointer-events-none opacity-40"
  );

  return (
    <div className="flex flex-wrap items-center gap-1">
      {previous ? (
        <Link
          href={`/finance?month=${monthParam(previous)}`}
          aria-label="Previous month"
          className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
        >
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span aria-hidden="true" className={edge}>
          <ChevronLeft className="size-4" />
        </span>
      )}

      <span className="min-w-36 px-2 text-center text-sm font-medium">{label}</span>

      {next ? (
        <Link
          href={`/finance?month=${monthParam(next)}`}
          aria-label="Next month"
          className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span aria-hidden="true" className={edge}>
          <ChevronRight className="size-4" />
        </span>
      )}

      {/* Only worth offering once you have wandered off it. */}
      {!isCurrentMonth && (
        <Link href="/finance" className={cn(buttonVariants({ variant: "ghost" }))}>
          This month
        </Link>
      )}
    </div>
  );
}
