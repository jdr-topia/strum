import type { DocumentData } from 'firebase/firestore';
import { normalizeText } from '@/lib/keywords';
import type { AuthUser } from '@/types/user';
import type { Song, SongOwner } from '@/types/song';

/** Longest uploader name copied onto a public song (matches `firestore.rules`). */
export const MAX_OWNER_NAME = 100;

/** The name shown as "Shared by …". Never the email: Discover only shows display names. */
export function ownerNameFor(user: Pick<AuthUser, 'displayName'>): string {
  const name = (user.displayName ?? '').trim().slice(0, MAX_OWNER_NAME);
  return name || 'A friend';
}

/**
 * Fields of `publicSongs/{songId}`, copied from the owner's private song. `sharedAt` is added
 * by the API (server timestamp) only when the song is first made public.
 */
export function publicSongFields(song: Song, owner: SongOwner): Record<string, unknown> {
  return {
    ownerUid: owner.uid,
    ownerName: owner.name,
    title: song.title,
    artist: song.artist,
    album: song.album,
    durationSec: song.durationSec,
    cloudinaryPublicId: song.cloudinaryPublicId,
    audioUrl: song.audioUrl,
    format: song.format,
    bytes: song.bytes,
    coverPublicId: song.coverPublicId,
    coverUrl: song.coverUrl,
    searchKeywords: song.searchKeywords,
    createdAt: song.createdAt ?? null,
  };
}

/** A song from Discover. `owner` is always set; `sharedAtMs` orders "Recently shared". */
export type PublicSong = Song & { owner: SongOwner; sharedAtMs: number };

export function toPublicSong(id: string, data: DocumentData): PublicSong {
  const sharedAt = data.sharedAt as { toMillis?: () => number } | null | undefined;
  return {
    id,
    title: data.title ?? '',
    artist: data.artist ?? '',
    album: data.album ?? null,
    durationSec: data.durationSec ?? 0,
    cloudinaryPublicId: data.cloudinaryPublicId,
    audioUrl: data.audioUrl,
    format: data.format ?? '',
    bytes: data.bytes ?? 0,
    coverPublicId: data.coverPublicId ?? null,
    coverUrl: data.coverUrl ?? null,
    searchKeywords: Array.isArray(data.searchKeywords) ? data.searchKeywords : [],
    deleted: false,
    isPublic: true,
    createdAt: data.createdAt ?? null,
    owner: { uid: data.ownerUid, name: data.ownerName || 'A friend' },
    sharedAtMs: typeof sharedAt?.toMillis === 'function' ? sharedAt.toMillis() : 0,
  };
}

/** True when the signed-in user may edit or delete this song (their own library song). */
export function isOwnSong(song: Song, uid: string | null): boolean {
  return !song.owner || song.owner.uid === uid;
}

/**
 * Songs a playlist can hold: the user's own library plus other people's public songs.
 * Own songs win, so the user's own (editable) copy is used for songs they shared.
 */
export function mergePlayable(library: Song[], publicSongs: Song[], uid: string | null): Song[] {
  const own = new Set(library.map((s) => s.id));
  return [...library, ...publicSongs.filter((s) => !own.has(s.id) && s.owner?.uid !== uid)];
}

/** Playlist ids that no longer point at a playable song (deleted, or made private by its owner). */
export function unavailableIds(songIds: string[], playable: Song[]): string[] {
  const ids = new Set(playable.map((s) => s.id));
  return songIds.filter((id) => !ids.has(id));
}

export type DiscoverSort = 'recent' | 'title' | 'artist' | 'sharer';

export const DISCOVER_SORT_LABELS: Record<DiscoverSort, string> = {
  recent: 'Recently shared',
  title: 'Title',
  artist: 'Artist',
  sharer: 'Shared by',
};

export type DiscoverFilter = 'everyone' | 'others' | 'mine';

const byText = (a: string | null, b: string | null) =>
  (a ?? '').localeCompare(b ?? '', undefined, { sensitivity: 'base', numeric: true });

/**
 * Filters by who shared it and by text (every word must appear in title, artist, album or the
 * sharer's name), then sorts. Returns a new array.
 */
export function discoverSongs(
  songs: PublicSong[],
  options: { query: string; sort: DiscoverSort; filter: DiscoverFilter; uid: string | null },
): PublicSong[] {
  const words = normalizeText(options.query).split(' ').filter(Boolean);
  const out = songs.filter((s) => {
    const mine = s.owner.uid === options.uid;
    if (options.filter === 'mine' && !mine) return false;
    if (options.filter === 'others' && mine) return false;
    if (words.length === 0) return true;
    const haystack = normalizeText(`${s.title} ${s.artist} ${s.album ?? ''} ${s.owner.name}`);
    return words.every((w) => haystack.includes(w));
  });
  switch (options.sort) {
    case 'recent':
      return out.sort((a, b) => b.sharedAtMs - a.sharedAtMs || byText(a.title, b.title));
    case 'title':
      return out.sort((a, b) => byText(a.title, b.title));
    case 'artist':
      return out.sort((a, b) => byText(a.artist, b.artist) || byText(a.title, b.title));
    case 'sharer':
      return out.sort((a, b) => byText(a.owner.name, b.owner.name) || byText(a.title, b.title));
  }
}
