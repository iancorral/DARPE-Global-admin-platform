import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { weekPagerLinks } from "../week-pager";

/**
 * The week the calendar is showing, and the way to the ones either side.
 *
 * A bar of its own directly above the grid, with the arrows pushed to the two
 * ends and the week's dates centred between them — Ian's reference. The control
 * spans the thing it moves, so it reads as "this calendar, these dates".
 *
 * It is the calendar's only navigation. "Back to this week" appears under the
 * dates once you have left the current week and not before: shown all the time
 * it was a button that did nothing, sitting beside dates that already said
 * where you were. Sized so the bar is the same height with or without it, so
 * paging never makes the grid below jump.
 *
 * Links, never buttons: navigation must not be able to end up stuck behind a
 * pending flag, and a week has an address worth sharing.
 */
export function WeekPager({
  weekStart,
  todayWeekStart,
  rangeLabel,
  teacherId,
  movingSessionId,
}: {
  weekStart: string;
  todayWeekStart: string;
  /** "Sep 14 – Sep 20, 2026". Shown uppercase. */
  rangeLabel: string;
  teacherId?: string;
  movingSessionId?: string;
}) {
  const links = weekPagerLinks({
    weekStart,
    todayWeekStart,
    teacherId,
    movingId: movingSessionId,
  });

  const arrow = cn(
    buttonVariants({ variant: "outline", size: "icon" }),
    "shrink-0 rounded-full"
  );

  return (
    <nav
      aria-label="Week"
      className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-xl border bg-card px-2 py-2 shadow-xs"
    >
      <Link href={links.previous} aria-label="Previous week" className={arrow}>
        <ChevronLeft className="size-4" />
      </Link>

      <div className="flex h-9 min-w-0 flex-col items-center justify-center">
        <p
          aria-current={links.isOnTodaysWeek ? "date" : undefined}
          className="min-w-0 truncate text-center text-sm leading-5 font-semibold tracking-[0.12em] uppercase"
        >
          {rangeLabel}
          {links.isOnTodaysWeek && <span className="sr-only"> (this week)</span>}
        </p>
        {!links.isOnTodaysWeek && (
          <Link
            href={links.today}
            className="text-xs leading-4 font-medium text-primary hover:underline"
          >
            Back to this week
          </Link>
        )}
      </div>

      <Link href={links.next} aria-label="Next week" className={arrow}>
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
