import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The pay week on screen, with the weeks either side.
 *
 * Links, like every pager in the app. Forward stops at the current week —
 * there is nothing to pay for a week that has not happened — and "This week to
 * pay" returns to the week due on the coming Friday.
 */
export function PayWeekPager({
  label,
  sublabel,
  previousHref,
  nextHref,
  defaultHref,
}: {
  label: string;
  sublabel: string;
  previousHref: string;
  nextHref: string | null;
  /** Back to the week due this Friday; null when already showing it. */
  defaultHref: string | null;
}) {
  const arrow = cn(buttonVariants({ variant: "outline", size: "icon" }), "shrink-0 rounded-full");

  return (
    <nav
      aria-label="Pay week"
      className="mb-4 flex items-center justify-between gap-3 rounded-xl border bg-card px-2 py-2 shadow-xs"
    >
      <Link href={previousHref} aria-label="Previous week" className={arrow}>
        <ChevronLeft className="size-4" />
      </Link>

      <div className="flex min-w-0 flex-col items-center text-center">
        <p className="truncate text-sm font-semibold tracking-[0.08em] uppercase">{label}</p>
        <p className="truncate text-xs text-muted-foreground">
          {sublabel}
          {defaultHref && (
            <>
              {" · "}
              <Link href={defaultHref} className="font-medium text-primary hover:underline">
                This week to pay
              </Link>
            </>
          )}
        </p>
      </div>

      {nextHref ? (
        <Link href={nextHref} aria-label="Next week" className={arrow}>
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(arrow, "pointer-events-none opacity-40")}>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
