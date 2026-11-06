import type { RepeatMode } from '@/types/player';

/** Within this many seconds, "previous" goes to the previous song instead of restarting. */
export const RESTART_THRESHOLD_SEC = 3;

/** Fisher–Yates shuffle. `random` is injectable so tests are deterministic. */
export function shuffleArray<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The song with `currentId` goes first; everything else is shuffled after it. */
export function shuffleAround<T extends { id: string }>(
  songs: readonly T[],
  currentId: string | undefined,
  random?: () => number,
): T[] {
  const idx = currentId === undefined ? -1 : songs.findIndex((s) => s.id === currentId);
  if (idx < 0) return shuffleArray(songs, random);
  const rest = songs.filter((_, i) => i !== idx);
  return [songs[idx], ...shuffleArray(rest, random)];
}

/**
 * Index to play after `index`, or null when the queue should stop.
 * Repeat "off" stops at the end; any other mode wraps to the start.
 */
export function nextIndex(index: number, length: number, repeat: RepeatMode): number | null {
  if (length === 0) return null;
  if (index + 1 < length) return index + 1;
  return repeat === 'off' ? null : 0;
}

/** "Previous": restart the song when it's been playing a while (or is the first), else go back one. */
export function prevTarget(
  positionSec: number,
  index: number,
): { action: 'restart' } | { action: 'goto'; index: number } {
  if (positionSec > RESTART_THRESHOLD_SEC || index <= 0) return { action: 'restart' };
  return { action: 'goto', index: index - 1 };
}

/** Moves the item at `from` to `to` (both within bounds) and returns a new array. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const a = [...items];
  const [moved] = a.splice(from, 1);
  a.splice(to, 0, moved);
  return a;
}
