/**
 * The semantic accent families, and the rules for choosing one.
 *
 * A tone is chosen, never invented: a language always maps to the same tone,
 * and a person always gets the same avatar colour, so staff can learn the
 * palette instead of re-reading it. The tokens themselves live in
 * `globals.css`; this module decides which one applies and names the classes.
 *
 * Pure and free of any database concept — a tone is a presentation decision.
 */

export const TONES = [
  "violet",
  "blue",
  "teal",
  "amber",
  "rose",
  "cyan",
  "moss",
  "clay",
  "indigo",
  "slate",
  "plum",
] as const;

export type Tone = (typeof TONES)[number];

/**
 * Class strings per tone, written out in full because Tailwind scans source
 * text: a class assembled from fragments at runtime would never be generated.
 */
export const TONE_CLASSES: Record<
  Tone,
  {
    chip: string;
    surface: string;
    line: string;
    dot: string;
    avatar: string;
    bar: string;
    /** The foreground alone, for an icon sitting on the page's own ground. */
    text: string;
  }
> = {
  violet: {
    chip: "bg-tone-violet text-tone-violet-fg border-tone-violet-line",
    surface: "bg-tone-violet",
    line: "border-l-tone-violet-solid",
    dot: "bg-tone-violet-solid",
    avatar: "bg-tone-violet text-tone-violet-fg",
    bar: "bg-tone-violet-solid",
    text: "text-tone-violet-fg",
  },
  blue: {
    chip: "bg-tone-blue text-tone-blue-fg border-tone-blue-line",
    surface: "bg-tone-blue",
    line: "border-l-tone-blue-solid",
    dot: "bg-tone-blue-solid",
    avatar: "bg-tone-blue text-tone-blue-fg",
    bar: "bg-tone-blue-solid",
    text: "text-tone-blue-fg",
  },
  teal: {
    chip: "bg-tone-teal text-tone-teal-fg border-tone-teal-line",
    surface: "bg-tone-teal",
    line: "border-l-tone-teal-solid",
    dot: "bg-tone-teal-solid",
    avatar: "bg-tone-teal text-tone-teal-fg",
    bar: "bg-tone-teal-solid",
    text: "text-tone-teal-fg",
  },
  amber: {
    chip: "bg-tone-amber text-tone-amber-fg border-tone-amber-line",
    surface: "bg-tone-amber",
    line: "border-l-tone-amber-solid",
    dot: "bg-tone-amber-solid",
    avatar: "bg-tone-amber text-tone-amber-fg",
    bar: "bg-tone-amber-solid",
    text: "text-tone-amber-fg",
  },
  rose: {
    chip: "bg-tone-rose text-tone-rose-fg border-tone-rose-line",
    surface: "bg-tone-rose",
    line: "border-l-tone-rose-solid",
    dot: "bg-tone-rose-solid",
    avatar: "bg-tone-rose text-tone-rose-fg",
    bar: "bg-tone-rose-solid",
    text: "text-tone-rose-fg",
  },
  cyan: {
    chip: "bg-tone-cyan text-tone-cyan-fg border-tone-cyan-line",
    surface: "bg-tone-cyan",
    line: "border-l-tone-cyan-solid",
    dot: "bg-tone-cyan-solid",
    avatar: "bg-tone-cyan text-tone-cyan-fg",
    bar: "bg-tone-cyan-solid",
    text: "text-tone-cyan-fg",
  },
  moss: {
    chip: "bg-tone-moss text-tone-moss-fg border-tone-moss-line",
    surface: "bg-tone-moss",
    line: "border-l-tone-moss-solid",
    dot: "bg-tone-moss-solid",
    avatar: "bg-tone-moss text-tone-moss-fg",
    bar: "bg-tone-moss-solid",
    text: "text-tone-moss-fg",
  },
  clay: {
    chip: "bg-tone-clay text-tone-clay-fg border-tone-clay-line",
    surface: "bg-tone-clay",
    line: "border-l-tone-clay-solid",
    dot: "bg-tone-clay-solid",
    avatar: "bg-tone-clay text-tone-clay-fg",
    bar: "bg-tone-clay-solid",
    text: "text-tone-clay-fg",
  },
  indigo: {
    chip: "bg-tone-indigo text-tone-indigo-fg border-tone-indigo-line",
    surface: "bg-tone-indigo",
    line: "border-l-tone-indigo-solid",
    dot: "bg-tone-indigo-solid",
    avatar: "bg-tone-indigo text-tone-indigo-fg",
    bar: "bg-tone-indigo-solid",
    text: "text-tone-indigo-fg",
  },
  slate: {
    chip: "bg-tone-slate text-tone-slate-fg border-tone-slate-line",
    surface: "bg-tone-slate",
    line: "border-l-tone-slate-solid",
    dot: "bg-tone-slate-solid",
    avatar: "bg-tone-slate text-tone-slate-fg",
    bar: "bg-tone-slate-solid",
    text: "text-tone-slate-fg",
  },
  plum: {
    chip: "bg-tone-plum text-tone-plum-fg border-tone-plum-line",
    surface: "bg-tone-plum",
    line: "border-l-tone-plum-solid",
    dot: "bg-tone-plum-solid",
    avatar: "bg-tone-plum text-tone-plum-fg",
    bar: "bg-tone-plum-solid",
    text: "text-tone-plum-fg",
  },
};

/** Comparable form of a language code or name: lowercase, unaccented, trimmed. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

/**
 * The nine languages DARPE teaches, each in the colour its flag makes people
 * think of.
 *
 * Colour here is a memory aid, and the strongest association most people carry
 * for a language is its country's flag — so Spanish is the gold of Spain's,
 * Japanese the crimson circle, Italian the green stripe. That beats an
 * arbitrary spread, because staff learn it once and stop reading the label.
 *
 * Where fidelity and telling them apart pull against each other, **telling
 * them apart wins** — the whole job of the colour is picking a row out at a
 * glance. Four of these flags are mostly red and three are mostly blue, so:
 *
 * - Japanese takes crimson (the flag is a red circle and nothing else) and
 *   Chinese takes the warmer vermilion beside it.
 * - German goes graphite for the black in its flag rather than a fourth red.
 * - French keeps the bright flag blue and Swedish the pale blue of its own.
 * - English is teal, not navy. Navy sat next to French blue and next to DARPE's
 *   violet, and on a calendar that is mostly English and French the two read
 *   as one colour (Ian, 2026-09-22). English is the most common class, so it
 *   gets a hue nothing else shares. Korean takes the indigo instead — the
 *   blue half of the taegeuk, and rare enough not to crowd French.
 *
 * Colour is never the only signal: calendar cards also carry the two-letter
 * code from `languageCode`.
 *
 * Violet is deliberately absent: it is DARPE's own colour, and a language
 * wearing it would compete with the interface. Plum stays unassigned so it can
 * mean "not one of ours".
 */
const TONE_BY_LANGUAGE_CODE: Record<string, Tone> = {
  es: "amber",
  en: "teal",
  fr: "blue",
  it: "moss",
  de: "slate",
  ja: "rose",
  zh: "clay",
  ko: "indigo",
  sv: "cyan",
};

const TONE_BY_LANGUAGE_NAME: Record<string, Tone> = {
  spanish: "amber",
  espanol: "amber",
  english: "teal",
  ingles: "teal",
  french: "blue",
  frances: "blue",
  italian: "moss",
  italiano: "moss",
  german: "slate",
  aleman: "slate",
  deutsch: "slate",
  japanese: "rose",
  japones: "rose",
  chinese: "clay",
  chino: "clay",
  mandarin: "clay",
  korean: "indigo",
  coreano: "indigo",
  swedish: "cyan",
  sueco: "cyan",
  svenska: "cyan",
};

/**
 * The tone a language always shows in.
 *
 * Matched on the stored code first and the name second, so renaming "English"
 * to "English (business)" keeps its colour as long as the code is intact. The
 * Spanish spellings are listed because the academy's own records may hold
 * either language's word for a language.
 *
 * Anything unrecognised gets neutral plum rather than a colour picked by hash:
 * a stable "not one of the seven" reads better than an arbitrary tone that
 * happens to collide with a real language's.
 */
export function languageTone(language: { name: string; code?: string | null }): Tone {
  const code = language.code ? normalize(language.code) : "";
  if (code && TONE_BY_LANGUAGE_CODE[code]) return TONE_BY_LANGUAGE_CODE[code];

  return TONE_BY_LANGUAGE_NAME[normalize(language.name)] ?? "plum";
}

/** Every accepted name, by the ISO code it stands for. */
const CODE_BY_LANGUAGE_NAME: Record<string, string> = Object.fromEntries(
  Object.keys(TONE_BY_LANGUAGE_NAME).map((name) => [
    name,
    Object.entries(TONE_BY_LANGUAGE_CODE).find(
      ([, tone]) => tone === TONE_BY_LANGUAGE_NAME[name]
    )?.[0] ?? "",
  ])
);

/**
 * The two-letter label a language wears beside its colour — EN, FR, JA.
 *
 * Colour alone is not enough to tell two classes apart (it fails for anyone
 * with colour-blindness, and on a washed-out projector), so the calendar
 * prints this too. The stored code wins; a known name maps to its code; an
 * unknown language shows its own first two letters rather than nothing.
 */
export function languageCode(language: { name: string; code?: string | null }): string {
  const code = language.code ? normalize(language.code) : "";
  if (code && TONE_BY_LANGUAGE_CODE[code]) return code.toUpperCase();

  const name = normalize(language.name);
  return (CODE_BY_LANGUAGE_NAME[name] || name.replace(/[^a-z]/g, "").slice(0, 2)).toUpperCase();
}

/**
 * A stable tone for a person, from their name.
 *
 * Only decoration — it distinguishes rows at a glance and means nothing — so
 * any spread over the palette will do, as long as the same person is always
 * the same colour.
 */
export function avatarTone(seed: string): Tone {
  const normalized = normalize(seed);
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) % 100_000;
  }

  return TONES[hash % TONES.length] ?? "plum";
}

/**
 * Up to two initials for a name: first and last word, so "María de la Cruz"
 * reads as MC rather than MD. Falls back to a single letter, then to nothing
 * the caller has to render as a shape.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";

  return (first + last).toUpperCase();
}
