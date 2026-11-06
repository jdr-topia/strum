import { normalizeText } from '@/lib/keywords';
import type { Song } from '@/types/song';

/** Two songs are "the same" if title + artist match and durations are within this many seconds. */
export const DUPLICATE_TOLERANCE_SEC = 2;

export interface DuplicateCandidate {
  title: string;
  artist: string;
  durationSec: number;
}

/** Returns the first library song that looks like the candidate, or undefined. */
export function findDuplicate(candidate: DuplicateCandidate, songs: Song[]): Song | undefined {
  const title = normalizeText(candidate.title);
  const artist = normalizeText(candidate.artist);
  return songs.find(
    (s) =>
      normalizeText(s.title) === title &&
      normalizeText(s.artist) === artist &&
      Math.abs(s.durationSec - candidate.durationSec) <= DUPLICATE_TOLERANCE_SEC,
  );
}
