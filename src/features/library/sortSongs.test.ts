import { describe, expect, it } from 'vitest';
import type { Song } from '@/types/song';
import { filterSongs, sortSongs } from './sortSongs';

const s = (id: string, title: string, artist: string, album: string | null = null) =>
  ({ id, title, artist, album }) as Song;

const songs = [
  s('1', 'Zebra', 'Bee', 'Alpha'),
  s('2', 'apple', 'Ant', null),
  s('3', 'Mango', 'Ant', 'Zed'),
];

describe('sortSongs', () => {
  it('keeps the incoming order for "recent"', () => {
    expect(sortSongs(songs, 'recent').map((x) => x.id)).toEqual(['1', '2', '3']);
  });

  it('sorts titles case-insensitively', () => {
    expect(sortSongs(songs, 'title').map((x) => x.title)).toEqual(['apple', 'Mango', 'Zebra']);
  });

  it('sorts by artist then title', () => {
    expect(sortSongs(songs, 'artist').map((x) => x.id)).toEqual(['2', '3', '1']);
  });

  it('does not mutate the input', () => {
    const copy = [...songs];
    sortSongs(songs, 'title');
    expect(songs).toEqual(copy);
  });
});

describe('filterSongs', () => {
  it('matches every query word across title, artist and album', () => {
    expect(filterSongs(songs, 'bee alpha').map((x) => x.id)).toEqual(['1']);
  });

  it('ignores case and accents', () => {
    const withAccent = [s('9', 'Déjà vu', 'X')];
    expect(filterSongs(withAccent, 'deja')).toHaveLength(1);
  });

  it('returns everything for an empty query', () => {
    expect(filterSongs(songs, '  ')).toHaveLength(3);
  });
});
