import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_CLASSES, type Tone } from "@/lib/tone";

/**
 * One operational figure.
 *
 * The icon sits in a tinted tile to the left of the number, which is what lets
 * four of these read as a row rather than four separate boxes. The tone is
 * carried by that tile alone — the card itself stays white, because four
 * blocks of solid colour would shout, and these are reference numbers rather
 * than alerts. The label always says what the number means, so colour only
 * helps the eye tell them apart.
 */
export function KpiCard({
  label,
  value,
  detail,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  detail?: string;
  tone: Tone;
  icon: LucideIcon;
}) {
  return (
    /*
     * Two layouts, one card. Side by side from `sm` up, where there is room
     * for a tile beside three lines of text. On a phone the tile sits above
     * the label instead: at two cards to a row it left about ten characters
     * for the label, and every one of them truncated — "Classes tau…",
     * "14 paused stud…" — which is worse than no label at all.
     */
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:gap-4">
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11",
          TONE_CLASSES[tone].avatar
        )}
      >
        <Icon className="size-5" strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        {/* Wraps on a phone rather than losing its ending. */}
        <p className="text-xs font-medium text-balance text-muted-foreground sm:truncate">
          {label}
        </p>
        <p className="font-serif text-2xl leading-tight font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {/*
          The detail line is always rendered, empty or not: without it the one
          card that has no detail sat a line higher than the other three, and a
          row of KPIs that do not line up is the first thing the eye catches.
        */}
        <p className="text-xs text-balance text-muted-foreground sm:truncate">
          {detail ?? " "}
        </p>
      </div>
    </div>
  );
}
