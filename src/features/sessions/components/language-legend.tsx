import { cn } from "@/lib/utils";
import { TONE_CLASSES, languageCode } from "@/lib/tone";
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
          {/* The same two letters the cards carry, in the card's own colours. */}
          <span
            aria-hidden="true"
            className={cn(
              "rounded border-l-[3px] px-1.5 py-0.5 text-[10px] leading-none font-bold tracking-wide",
              TONE_CLASSES[entry.tone].surface,
              TONE_CLASSES[entry.tone].line,
              TONE_CLASSES[entry.tone].text
            )}
          >
            {languageCode({ name: entry.name })}
          </span>
          {entry.name}
        </li>
      ))}
    </ul>
  );
}
