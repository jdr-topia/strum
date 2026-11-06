const KEY = 'strum.search.recent';
const MAX_RECENT = 8;

/** Recent searches on this device, newest first. Storage errors are ignored. */
export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

/** Returns the new list after putting `query` first (case-insensitive de-duplication). */
export function rememberSearch(recent: string[], query: string): string[] {
  const clean = query.trim();
  if (clean.length < 2) return recent;
  const next = [clean, ...recent.filter((q) => q.toLowerCase() !== clean.toLowerCase())].slice(
    0,
    MAX_RECENT,
  );
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: recent searches simply aren't kept.
  }
  return next;
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear if storage is blocked.
  }
}
