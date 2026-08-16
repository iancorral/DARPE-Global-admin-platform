/**
 * Text matching for list filters, tolerant of the accents Spanish names carry:
 * staff typing "martinez" must find "Martínez", and typing "Martínez" must find
 * it too. Purely presentational filtering — never a substitute for server-side
 * authorization or validation.
 */

/** Lowercases and strips combining accents, so "Martínez" becomes "martinez". */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Whether every word of the query appears somewhere in the joined fields.
 *
 * Word-by-word so "maria english" matches a María who studies English even
 * though no single field contains both. An empty query matches everything —
 * an empty search box is not a filter.
 */
export function matchesSearch(query: string, fields: (string | null)[]): boolean {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = normalizeForSearch(fields.filter(Boolean).join(" "));
  return terms.every((term) => haystack.includes(term));
}
