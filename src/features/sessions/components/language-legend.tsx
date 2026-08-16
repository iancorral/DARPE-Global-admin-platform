import { cn } from "@/lib/utils";
import { TONE_CLASSES } from "@/lib/tone";
import type { LegendEntry } from "../legend";

/**
 * What the card colours mean, for the week currently on screen.
 *
 * Only the languages this week actually contains, so the legend never lists a
 * colour the grid is not using. It explains the colour rather than replacing
 * anything: every card already names its language in text.
 */
export function LanguageLegend({
  entries,
  className,
}: {
  entries: LegendEntry[];
  className?: string;
}) {
  if (entries.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
      {entries.map((entry) => (
        <li key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden="true"
            className={cn("size-2 rounded-full", TONE_CLASSES[entry.tone].dot)}
          />
          {entry.name}
        </li>
      ))}
    </ul>
  );
}
