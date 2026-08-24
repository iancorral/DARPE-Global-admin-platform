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
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-xs">
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-11 shrink-0 items-center justify-center rounded-xl",
          TONE_CLASSES[tone].avatar
        )}
      >
        <Icon className="size-5" strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-serif text-2xl leading-tight font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}
