import { describe, expect, it } from 'vitest';
import type { Song } from '@/types/song';
import { resolvePlaylistSongs, totalDurationSec } from './resolvePlaylistSongs';

const song = (id: string, durationSec = 100): Song => ({ id, title: id, durationSec }) as Song;

describe('resolvePlaylistSongs', () => {
  it('keeps playlist order and skips deleted or unknown songs', () => {
    const library = [song('a'), song('b'), song('c')];
    const resolved = resolvePlaylistSongs(['c', 'gone', 'a'], library);
    expect(resolved.map((s) => s.id)).toEqual(['c', 'a']);
  });

  it('sums durations', () => {
    expect(totalDurationSec([song('a', 60), song('b', 90)])).toBe(150);
  });
});
