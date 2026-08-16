import { languageTone, type Tone } from "@/lib/tone";

export type LegendEntry = { name: string; tone: Tone };

/**
 * The languages actually taught in the week on screen.
 *
 * Derived from the sessions being shown rather than from the language table,
 * so the legend explains the colours present and never advertises a language
 * the week does not contain. An empty week has no legend at all, which is why
 * this can return nothing and the caller renders nothing.
 *
 * Sorted by name so the order does not shuffle as classes move around, and
 * deduplicated by name because that is what the calendar displays.
 */
export function visibleLanguageLegend(
  sessions: { languageName: string }[]
): LegendEntry[] {
  const names = [...new Set(sessions.map((session) => session.languageName))];

  return names
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, tone: languageTone({ name }) }));
}
