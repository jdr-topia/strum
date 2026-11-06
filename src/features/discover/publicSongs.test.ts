import { describe, expect, it } from 'vitest';
import type { Song } from '@/types/song';
import {
  discoverSongs,
  isOwnSong,
  mergePlayable,
  ownerNameFor,
  publicSongFields,
  toPublicSong,
  unavailableIds,
  type PublicSong,
} from './publicSongs';

const song = (id: string, over: Partial<Song> = {}): Song => ({
  id,
  title: `Title ${id}`,
  artist: 'Artist',
  album: null,
  durationSec: 120,
  cloudinaryPublicId: `strum/songs/u1/${id}`,
  audioUrl: `https://res.cloudinary.com/demo/video/upload/${id}.mp3`,
  format: 'mp3',
  bytes: 10,
  coverPublicId: null,
  coverUrl: null,
  searchKeywords: ['title'],
  deleted: false,
  isPublic: false,
  createdAt: null,
  ...over,
});

const shared = (
  id: string,
  ownerUid: string,
  ownerName: string,
  sharedAtMs: number,
  over: Partial<Song> = {},
): PublicSong => ({
  ...song(id, { isPublic: true, ...over }),
  owner: { uid: ownerUid, name: ownerName },
  sharedAtMs,
});

describe('ownerNameFor', () => {
  it('uses the trimmed display name and never the email', () => {
    expect(ownerNameFor({ displayName: '  Rahul  ' })).toBe('Rahul');
    expect(ownerNameFor({ displayName: null })).toBe('A friend');
    expect(ownerNameFor({ displayName: '   ' })).toBe('A friend');
  });

  it('caps long names at 100 characters (the rules limit)', () => {
    expect(ownerNameFor({ displayName: 'x'.repeat(150) })).toHaveLength(100);
  });
});

describe('publicSongFields / toPublicSong', () => {
  it('copies the song with its owner and round-trips through the reader', () => {
    const fields = publicSongFields(song('a', { album: 'Alb' }), { uid: 'u1', name: 'Asha' });
    expect(fields).toMatchObject({ ownerUid: 'u1', ownerName: 'Asha', title: 'Title a' });
    expect(fields).not.toHaveProperty('deleted');
    expect(fields).not.toHaveProperty('isPublic');

    const back = toPublicSong('a', { ...fields, sharedAt: { toMillis: () => 42 } });
    expect(back.owner).toEqual({ uid: 'u1', name: 'Asha' });
    expect(back.album).toBe('Alb');
    expect(back.isPublic).toBe(true);
    expect(back.sharedAtMs).toBe(42);
  });

  it('treats a pending server timestamp as 0', () => {
    const back = toPublicSong('a', publicSongFields(song('a'), { uid: 'u', name: 'n' }));
    expect(back.sharedAtMs).toBe(0);
  });
});

describe('isOwnSong', () => {
  it("library songs (no owner) and the user's own shared songs are theirs", () => {
    expect(isOwnSong(song('a'), 'u1')).toBe(true);
    expect(isOwnSong(shared('a', 'u1', 'Me', 1), 'u1')).toBe(true);
    expect(isOwnSong(shared('a', 'u2', 'Rahul', 1), 'u1')).toBe(false);
  });
});

describe('mergePlayable', () => {
  it("adds friends' public songs after the library, skipping own shared copies", () => {
    const library = [song('a', { isPublic: true }), song('b')];
    const publicSongs = [shared('a', 'u1', 'Me', 2), shared('c', 'u2', 'Rahul', 1)];
    const merged = mergePlayable(library, publicSongs, 'u1');
    expect(merged.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    // The library copy (editable, no owner) wins.
    expect(merged[0].owner).toBeUndefined();
  });

  it('ignores own public songs that are no longer in the library (e.g. just deleted)', () => {
    expect(mergePlayable([], [shared('a', 'u1', 'Me', 1)], 'u1')).toEqual([]);
  });
});

describe('unavailableIds', () => {
  it('lists playlist ids that resolve to nothing', () => {
    expect(unavailableIds(['a', 'gone', 'c'], [song('a'), song('c')])).toEqual(['gone']);
    expect(unavailableIds([], [song('a')])).toEqual([]);
  });
});

describe('discoverSongs', () => {
  const list = [
    shared('1', 'u2', 'Rahul', 10, { title: 'Zebra', artist: 'Beta' }),
    shared('2', 'u1', 'Asha', 30, { title: 'Apple', artist: 'Gamma' }),
    shared('3', 'u3', 'Bina', 20, { title: 'Mango', artist: 'Alpha', album: 'Café' }),
  ];
  const base = { query: '', sort: 'recent' as const, filter: 'everyone' as const, uid: 'u1' };

  it('sorts by most recently shared by default', () => {
    expect(discoverSongs(list, base).map((s) => s.id)).toEqual(['2', '3', '1']);
  });

  it('sorts by title, artist and sharer', () => {
    const ids = (sort: 'title' | 'artist' | 'sharer') =>
      discoverSongs(list, { ...base, sort }).map((s) => s.id);
    expect(ids('title')).toEqual(['2', '3', '1']);
    expect(ids('artist')).toEqual(['3', '1', '2']);
    expect(ids('sharer')).toEqual(['2', '3', '1']);
  });

  it('filters by who shared it', () => {
    expect(discoverSongs(list, { ...base, filter: 'mine' }).map((s) => s.id)).toEqual(['2']);
    expect(discoverSongs(list, { ...base, filter: 'others' }).map((s) => s.id)).toEqual(['3', '1']);
  });

  it("matches every word against title, artist, album and the sharer's name", () => {
    expect(discoverSongs(list, { ...base, query: 'rahul' }).map((s) => s.id)).toEqual(['1']);
    expect(discoverSongs(list, { ...base, query: 'cafe alpha' }).map((s) => s.id)).toEqual(['3']);
    expect(discoverSongs(list, { ...base, query: 'zebra gamma' })).toEqual([]);
  });

  it('does not mutate the input', () => {
    const copy = [...list];
    discoverSongs(list, { ...base, sort: 'title' });
    expect(list).toEqual(copy);
  });
});
