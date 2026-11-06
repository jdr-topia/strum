import { normalizeText } from '@/lib/keywords';
import type { Song } from '@/types/song';

export type SongSort = 'recent' | 'title' | 'artist' | 'album';

export const SONG_SORT_LABELS: Record<SongSort, string> = {
  recent: 'Recently added',
  title: 'Title',
  artist: 'Artist',
  album: 'Album',
};

const byText = (a: string | null, b: string | null) =>
  (a ?? '').localeCompare(b ?? '', undefined, { sensitivity: 'base', numeric: true });

/** Returns a new array. "recent" keeps the Firestore order (newest first). */
export function sortSongs(songs: Song[], sort: SongSort): Song[] {
  const copy = [...songs];
  switch (sort) {
    case 'recent':
      return copy;
    case 'title':
      return copy.sort((a, b) => byText(a.title, b.title));
    case 'artist':
      return copy.sort((a, b) => byText(a.artist, b.artist) || byText(a.title, b.title));
    case 'album':
      return copy.sort((a, b) => byText(a.album, b.album) || byText(a.title, b.title));
  }
}

/** Every word of the query must appear somewhere in title, artist or album (diacritic-insensitive). */
export function filterSongs(songs: Song[], query: string): Song[] {
  const words = normalizeText(query).split(' ').filter(Boolean);
  if (words.length === 0) return songs;
  return songs.filter((s) => {
    const haystack = normalizeText(`${s.title} ${s.artist} ${s.album ?? ''}`);
    return words.every((w) => haystack.includes(w));
  });
}
