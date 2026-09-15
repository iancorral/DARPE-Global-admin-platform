import { normalizeForSearch } from "@/lib/search";

/**
 * A record that already exists, as a create form shows it beside the fields.
 *
 * The create forms used to carry paragraphs explaining themselves. What staff
 * actually need at that moment is different: to notice that the person they
 * are about to add is already on record. DARPE's own register spells the same
 * person two ways often enough for that to matter.
 */
export type DirectoryEntry = {
  id: string;
  name: string;
  /** The record's page. Opened in a new tab, so the form keeps what was typed. */
  href: string;
  /** One short line: language, teacher, state. */
  detail: string;
};

/** How many entries a list shows, whether something has been typed or not. */
export const DIRECTORY_LIMIT = 5;

/** Two letters is where a start of a word stops matching half the list. */
const MIN_TYPED_LENGTH = 2;

function wordsOf(value: string): string[] {
  return normalizeForSearch(value).split(/[\s-]+/).filter(Boolean);
}

/**
 * Existing records whose name looks like the one being typed, best match first.
 *
 * A record matches when some word of its name starts with some word typed,
 * accents ignored: "ang" finds "Ángel", and a first name alone is enough to
 * surface everyone who shares it. Records matching more of the typed words
 * rank higher; ties keep the order they arrived in, which is newest first.
 *
 * Null while nothing usable has been typed, so the caller can show recent
 * records instead — "no matches" and "not searched yet" are different answers.
 */
export function similarEntries(
  query: string,
  entries: DirectoryEntry[],
  limit: number = DIRECTORY_LIMIT
): DirectoryEntry[] | null {
  const typed = wordsOf(query).filter((word) => word.length >= MIN_TYPED_LENGTH);
  if (typed.length === 0) return null;

  return entries
    .map((entry, index) => {
      const nameWords = wordsOf(entry.name);
      const hits = typed.filter((word) =>
        nameWords.some((nameWord) => nameWord.startsWith(word))
      ).length;

      return { entry, hits, index };
    })
    .filter((candidate) => candidate.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.index - b.index)
    .slice(0, limit)
    .map((candidate) => candidate.entry);
}
