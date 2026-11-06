import { describe, expect, it } from 'vitest';
import type { Playlist } from '@/types/playlist';
import type { Song } from '@/types/song';
import { buildSearchIndex, matchScore, parseQuery, runSearch } from './searchEngine';

const song = (id: string, title: string, artist: string, album: string | null = null): Song =>
  ({ id, title, artist, album, durationSec: 100 }) as Song;

const playlist = (id: string, name: string): Playlist =>
  ({ id, name, folderId: null, songIds: [] }) as unknown as Playlist;

describe('matchScore', () => {
  it('ranks prefix > word start > substring', () => {
    expect(matchScore('halo beyonce', parseQuery('hal'))).toBe(3);
    expect(matchScore('halo beyonce', parseQuery('bey'))).toBe(2);
    expect(matchScore('halo beyonce', parseQuery('yonc'))).toBe(1);
  });

  it('requires every query word to match', () => {
    expect(matchScore('halo beyonce', parseQuery('halo nope'))).toBe(0);
    expect(matchScore('halo beyonce', parseQuery('halo bey'))).toBe(2);
  });

  it('ignores case and diacritics', () => {
    expect(parseQuery('Café')).toEqual(['cafe']);
    expect(matchScore('cafe', ['cafe'])).toBe(3);
  });
});

describe('runSearch', () => {
  const songs = [
    song('1', 'Halo', 'Beyonce', 'I Am... Sasha Fierce'),
    song('2', 'Crazy in Love', 'Beyonce'),
    song('3', 'Hallelujah', 'Jeff Buckley', 'Grace'),
    song('4', 'Crazy', 'Gnarls Barkley', null),
  ];
  const index = buildSearchIndex(songs);
  const playlists = [playlist('p1', 'Halloween mix'), playlist('p2', 'Chill')];

  it('returns nothing for an empty query', () => {
    const r = runSearch(index, playlists, '   ');
    expect(r.songs).toHaveLength(0);
    expect(r.playlists).toHaveLength(0);
  });

  it('ranks title prefix matches above word matches', () => {
    const r = runSearch(index, playlists, 'hal');
    expect(r.songs.map((h) => h.song.id)).toEqual(['3', '1']);
  });

  it('groups artists and albums with counts', () => {
    const r = runSearch(index, playlists, 'beyonce');
    expect(r.artists).toEqual([{ name: 'Beyonce', count: 2, score: 3 }]);
    expect(r.songs.map((h) => h.song.id)).toEqual(['2', '1']);
    expect(r.albums).toEqual([]);

    const albums = runSearch(index, playlists, 'grace');
    expect(albums.albums.map((a) => [a.name, a.artist, a.count])).toEqual([
      ['Grace', 'Jeff Buckley', 1],
    ]);
  });

  it('finds playlists by name', () => {
    const r = runSearch(index, playlists, 'hallo');
    expect(r.playlists.map((h) => h.playlist.id)).toEqual(['p1']);
  });
});
