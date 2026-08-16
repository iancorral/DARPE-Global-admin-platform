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
  "plum",
] as const;

export type Tone = (typeof TONES)[number];

/**
 * Class strings per tone, written out in full because Tailwind scans source
 * text: a class assembled from fragments at runtime would never be generated.
 */
export const TONE_CLASSES: Record<
  Tone,
  { chip: string; surface: string; line: string; dot: string; avatar: string; bar: string }
> = {
  violet: {
    chip: "bg-tone-violet text-tone-violet-fg border-tone-violet-line",
    surface: "bg-tone-violet",
    line: "border-l-tone-violet-solid",
    dot: "bg-tone-violet-solid",
    avatar: "bg-tone-violet text-tone-violet-fg",
    bar: "bg-tone-violet-solid",
  },
  blue: {
    chip: "bg-tone-blue text-tone-blue-fg border-tone-blue-line",
    surface: "bg-tone-blue",
    line: "border-l-tone-blue-solid",
    dot: "bg-tone-blue-solid",
    avatar: "bg-tone-blue text-tone-blue-fg",
    bar: "bg-tone-blue-solid",
  },
  teal: {
    chip: "bg-tone-teal text-tone-teal-fg border-tone-teal-line",
    surface: "bg-tone-teal",
    line: "border-l-tone-teal-solid",
    dot: "bg-tone-teal-solid",
    avatar: "bg-tone-teal text-tone-teal-fg",
    bar: "bg-tone-teal-solid",
  },
  amber: {
    chip: "bg-tone-amber text-tone-amber-fg border-tone-amber-line",
    surface: "bg-tone-amber",
    line: "border-l-tone-amber-solid",
    dot: "bg-tone-amber-solid",
    avatar: "bg-tone-amber text-tone-amber-fg",
    bar: "bg-tone-amber-solid",
  },
  rose: {
    chip: "bg-tone-rose text-tone-rose-fg border-tone-rose-line",
    surface: "bg-tone-rose",
    line: "border-l-tone-rose-solid",
    dot: "bg-tone-rose-solid",
    avatar: "bg-tone-rose text-tone-rose-fg",
    bar: "bg-tone-rose-solid",
  },
  cyan: {
    chip: "bg-tone-cyan text-tone-cyan-fg border-tone-cyan-line",
    surface: "bg-tone-cyan",
    line: "border-l-tone-cyan-solid",
    dot: "bg-tone-cyan-solid",
    avatar: "bg-tone-cyan text-tone-cyan-fg",
    bar: "bg-tone-cyan-solid",
  },
  moss: {
    chip: "bg-tone-moss text-tone-moss-fg border-tone-moss-line",
    surface: "bg-tone-moss",
    line: "border-l-tone-moss-solid",
    dot: "bg-tone-moss-solid",
    avatar: "bg-tone-moss text-tone-moss-fg",
    bar: "bg-tone-moss-solid",
  },
  plum: {
    chip: "bg-tone-plum text-tone-plum-fg border-tone-plum-line",
    surface: "bg-tone-plum",
    line: "border-l-tone-plum-solid",
    dot: "bg-tone-plum-solid",
    avatar: "bg-tone-plum text-tone-plum-fg",
    bar: "bg-tone-plum-solid",
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
 * The seven languages DARPE teaches, each with its own tone. Plum is left
 * unassigned on purpose, so it can mean "not one of ours".
 */
const TONE_BY_LANGUAGE_CODE: Record<string, Tone> = {
  en: "violet",
  es: "teal",
  fr: "blue",
  it: "amber",
  ja: "rose",
  de: "cyan",
  sv: "moss",
};

const TONE_BY_LANGUAGE_NAME: Record<string, Tone> = {
  english: "violet",
  ingles: "violet",
  spanish: "teal",
  espanol: "teal",
  french: "blue",
  frances: "blue",
  italian: "amber",
  italiano: "amber",
  japanese: "rose",
  japones: "rose",
  german: "cyan",
  aleman: "cyan",
  swedish: "moss",
  sueco: "moss",
  svenska: "moss",
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
