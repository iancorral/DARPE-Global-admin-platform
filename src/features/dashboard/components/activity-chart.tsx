"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import type { ActivityWeek } from "../activity";

const SERIES = [
  { key: "completed", label: "Completed", bar: "bg-tone-teal-solid", dot: "bg-tone-teal-solid" },
  { key: "scheduled", label: "Scheduled", bar: "bg-tone-violet-solid", dot: "bg-tone-violet-solid" },
  { key: "cancelled", label: "Cancelled", bar: "bg-tone-plum-line", dot: "bg-tone-plum-line" },
] as const;

/**
 * Class activity for the month, one stacked bar per week.
 *
 * Built from divs rather than SVG because the shape is rectangles in a row:
 * flexbox handles the responsive width for free, and each bar can be a real
 * focusable button instead of a graphic that needs its own key handling.
 *
 * Accessibility: the whole figure is described in text above it, and the
 * graphic is `aria-hidden`, so nothing here is available only by hovering.
 * Each bar is still tabbable, revealing the same breakdown the pointer shows.
 */
export function ActivityChart({
  weeks,
  summary,
  className,
}: {
  weeks: ActivityWeek[];
  summary: string;
  className?: string;
}) {
  const [openWeek, setOpenWeek] = useState<string | null>(null);
  const tooltipId = useId();

  const tallest = Math.max(1, ...weeks.map((week) => week.total));
  const hasAny = weeks.some((week) => week.total > 0);

  return (
    <figure className={cn("m-0", className)}>
      {/* The chart's content in words: the accessible source of truth. */}
      <figcaption className="sr-only">{summary}</figcaption>

      {!hasAny ? (
        <p className="py-2 text-sm text-muted-foreground">
          No classes recorded this month yet. Activity appears here as classes are
          scheduled and completed.
        </p>
      ) : (
        <>
          <div className="flex h-40 items-end gap-2">
            {weeks.map((week, weekIndex) => {
              const isOpen = openWeek === week.weekStart;

              return (
                <div key={week.weekStart} className="relative flex min-w-0 flex-1 flex-col">
                  {isOpen && (
                    <div
                      id={`${tooltipId}-${week.weekStart}`}
                      role="tooltip"
                      className="absolute bottom-full left-1/2 z-10 mb-2 w-36 -translate-x-1/2 rounded-lg border bg-popover p-2 text-xs shadow-md"
                    >
                      <p className="font-medium">Week of {week.label}</p>
                      {SERIES.map((series) => (
                        <p key={series.key} className="flex items-center gap-1.5">
                          <span className={cn("size-1.5 rounded-full", series.dot)} />
                          <span className="text-muted-foreground">{series.label}</span>
                          <span className="ml-auto tabular-nums">{week[series.key]}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  {/*
                    A real button, so the tooltip opens on keyboard focus as
                    well as hover. Its label carries the same breakdown the
                    tooltip shows, so the figures never depend on seeing it.
                  */}
                  <button
                    type="button"
                    aria-describedby={isOpen ? `${tooltipId}-${week.weekStart}` : undefined}
                    aria-label={
                      `Week of ${week.label}: ${week.completed} completed, ` +
                      `${week.scheduled} scheduled, ${week.cancelled} cancelled.`
                    }
                    onMouseEnter={() => setOpenWeek(week.weekStart)}
                    onMouseLeave={() => setOpenWeek(null)}
                    onFocus={() => setOpenWeek(week.weekStart)}
                    onBlur={() => setOpenWeek(null)}
                    className={cn(
                      "flex h-32 w-full cursor-pointer flex-col justify-end gap-px rounded-md p-1 transition-colors",
                      "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "motion-reduce:transition-none",
                      isOpen && "bg-accent/40"
                    )}
                  >
                    {week.total === 0 ? (
                      <span aria-hidden="true" className="h-1 w-full rounded-sm bg-border" />
                    ) : (
                      SERIES.map((series) => {
                        const value = week[series.key];
                        if (value === 0) return null;

                        return (
                          <span
                            key={series.key}
                            aria-hidden="true"
                            // Grows up on first paint, staggered left to right,
                            // so the month reads as it appears.
                            className={cn("darpe-bar-grow w-full rounded-sm", series.bar)}
                            style={{
                              height: `${(value / tallest) * 100}%`,
                              animationDelay: `${weekIndex * 60}ms`,
                            }}
                          />
                        );
                      })
                    )}
                  </button>

                  <span className="mt-1.5 truncate text-center text-[10px] text-muted-foreground">
                    {week.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend, with each series' month total spelled out. */}
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {SERIES.map((series) => (
              <li key={series.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span aria-hidden="true" className={cn("size-2 rounded-full", series.dot)} />
                {series.label}
                <span className="tabular-nums text-foreground">
                  {weeks.reduce((sum, week) => sum + week[series.key], 0)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </figure>
  );
}
