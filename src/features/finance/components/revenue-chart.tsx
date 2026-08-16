"use client";

import { useId, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { formatMoney, type MoneySeriesPoint } from "../snapshot";

/**
 * Inset so the first and last points sit inside the frame instead of being
 * sliced by its edges, and so their tooltips have somewhere to go.
 */
const PAD_X = 7;
const PAD_TOP = 14;
const PAD_BOTTOM = 20;

type Active = { index: number; cursorPercent: number };

/**
 * Monthly revenue, read by moving along the line.
 *
 * The pointer is tracked across the whole plot rather than through one hit
 * area per month: a guide line and the tooltip follow the cursor and snap to
 * the nearest month, so there is no dead space between points and nothing to
 * aim at. That is what makes it feel live rather than like six buttons.
 *
 * One geometry in percentages drives every layer — the SVG path, the dots, the
 * guide and the tooltip — so they cannot drift apart at any width. Only the
 * line and its fill live in the stretched SVG; the dots are HTML, so
 * `preserveAspectRatio="none"` cannot squash them into ovals.
 *
 * Keyboard users get the same thing: one focusable button per month, which
 * activates the identical guide and tooltip.
 */
export function RevenueChart({
  points,
  currency,
  className,
}: {
  points: MoneySeriesPoint[];
  currency: string;
  className?: string;
}) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Active | null>(null);
  const tooltipId = useId();

  if (points.length === 0) return null;

  const highest = Math.max(...points.map((point) => point.amountCents), 1);
  const lastIndex = points.length - 1;

  const plotted = points.map((point, index) => ({
    point,
    isLast: index === lastIndex,
    x: lastIndex === 0 ? 50 : PAD_X + (index / lastIndex) * (100 - PAD_X * 2),
    y:
      100 -
      PAD_BOTTOM -
      (point.amountCents / highest) * (100 - PAD_TOP - PAD_BOTTOM),
  }));

  const line = plotted
    .map((entry, index) => `${index === 0 ? "M" : "L"}${entry.x},${entry.y}`)
    .join(" ");
  const area = `${line} L${plotted[lastIndex]?.x ?? 0},100 L${plotted[0]?.x ?? 0},100 Z`;

  // Rough path length for the draw-in; it only has to be at least as long as
  // the path, and measuring the real one would mean a DOM read after mount.
  const lineLength = plotted.reduce((total, entry, index) => {
    const previous = plotted[index - 1];
    return previous
      ? total + Math.hypot(entry.x - previous.x, entry.y - previous.y)
      : total;
  }, 0);

  /** The month whose point is closest to where the pointer is. */
  function trackPointer(event: MouseEvent<HTMLDivElement>) {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;

    const cursorPercent = ((event.clientX - rect.left) / rect.width) * 100;
    let index = 0;
    let closest = Infinity;

    for (const [candidate, entry] of plotted.entries()) {
      const distance = Math.abs(entry.x - cursorPercent);
      if (distance < closest) {
        closest = distance;
        index = candidate;
      }
    }

    setActive({ index, cursorPercent });
  }

  const activeEntry = active ? plotted[active.index] : undefined;

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={plotRef}
        className="relative h-48 w-full"
        onMouseMove={trackPointer}
        onMouseLeave={() => setActive(null)}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 size-full"
        >
          <defs>
            <linearGradient id={`${tooltipId}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-tone-violet-solid)" stopOpacity="0.30" />
              <stop offset="100%" stopColor="var(--color-tone-violet-solid)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${tooltipId}-fill)`} className="darpe-area-fade" />
          <path
            d={line}
            fill="none"
            className="darpe-line-draw stroke-tone-violet-solid"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ ["--darpe-line-length" as string]: lineLength }}
          />
        </svg>

        {/* The guide: a hairline dropped through the month being read. */}
        {activeEntry && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-px bg-primary/30 transition-[left] duration-100 ease-out motion-reduce:transition-none"
            style={{ left: `${activeEntry.x}%` }}
          />
        )}

        {plotted.map((entry, index) => {
          const isActive = active?.index === index;

          return (
            <span
              key={entry.point.monthStart}
              aria-hidden="true"
              className={cn(
                "darpe-area-fade pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card transition-[width,height] duration-100 motion-reduce:transition-none",
                isActive || entry.isLast ? "size-3.5" : "size-2.5",
                isActive ? "bg-primary" : "bg-tone-violet-solid"
              )}
              style={{ left: `${entry.x}%`, top: `${entry.y}%` }}
            />
          );
        })}

        {/*
          The tooltip rides with the cursor and is clamped so it never leaves
          the plot at either end.
        */}
        {active && activeEntry && (
          <div
            id={`${tooltipId}-tip`}
            role="tooltip"
            className="pointer-events-none absolute z-20 w-32 -translate-x-1/2 -translate-y-full rounded-lg border bg-popover p-2 text-center text-xs shadow-md"
            style={{
              left: `clamp(4rem, ${active.cursorPercent}%, calc(100% - 4rem))`,
              top: `calc(${activeEntry.y}% - 0.85rem)`,
            }}
          >
            <p className="font-medium">{activeEntry.point.label}</p>
            <p className="text-muted-foreground">
              {formatMoney(activeEntry.point.amountCents, currency)}
            </p>
          </div>
        )}
      </div>

      {/*
        The month labels double as the keyboard path: each is a button that
        activates the same guide and tooltip its point would.
      */}
      <div className="mt-1 flex">
        {plotted.map((entry, index) => (
          <button
            key={entry.point.monthStart}
            type="button"
            aria-describedby={active?.index === index ? `${tooltipId}-tip` : undefined}
            aria-label={`${entry.point.label}: ${formatMoney(entry.point.amountCents, currency)}`}
            onFocus={() => setActive({ index, cursorPercent: entry.x })}
            onBlur={() => setActive(null)}
            className={cn(
              "flex-1 cursor-pointer rounded-md py-1 text-[11px] transition-colors",
              "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "motion-reduce:transition-none",
              entry.isLast ? "font-semibold text-foreground" : "text-muted-foreground",
              active?.index === index && "bg-accent/40 text-foreground"
            )}
          >
            {entry.point.label}
          </button>
        ))}
      </div>
    </div>
  );
}
