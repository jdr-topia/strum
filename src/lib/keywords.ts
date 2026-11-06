/** Maximum number of search tokens stored per song (keeps the document small). */
export const MAX_SEARCH_KEYWORDS = 50;
const MIN_PREFIX_LENGTH = 2;

/** Lowercase, strip diacritics and punctuation. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Tokens for `array-contains` prefix search (Phase 4): every whole word first, then
 * prefixes (min 2 chars) of each word. Capped at MAX_SEARCH_KEYWORDS.
 */
export function buildSearchKeywords(...fields: (string | null | undefined)[]): string[] {
  const words: string[] = [];
  for (const field of fields) {
    if (!field) continue;
    for (const word of normalizeText(field).split(' ')) {
      if (word) words.push(word);
    }
  }

  const keywords = new Set<string>(words);
  for (const word of words) {
    for (let len = MIN_PREFIX_LENGTH; len < word.length; len++) {
      keywords.add(word.slice(0, len));
    }
  }

  return [...keywords].slice(0, MAX_SEARCH_KEYWORDS);
}
