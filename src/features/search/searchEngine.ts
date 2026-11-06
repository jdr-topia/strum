import { normalizeText } from '@/lib/keywords';
import type { Playlist } from '@/types/playlist';
import type { Song } from '@/types/song';

/** Normalised text for one song, prepared once per library change (not per keystroke). */
export interface IndexedSong {
  song: Song;
  artist: string;
  album: string;
  all: string;
}

export function buildSearchIndex(songs: Song[]): IndexedSong[] {
  return songs.map((song) => {
    const album = song.album ?? '';
    return {
      song,
      artist: normalizeText(song.artist),
      album: normalizeText(album),
      all: normalizeText(`${song.title} ${song.artist} ${album}`),
    };
  });
}

export function parseQuery(query: string): string[] {
  return normalizeText(query).split(' ').filter(Boolean);
}

/**
 * How well `text` matches every word of the query: 3 = starts with the word,
 * 2 = a word starts with it, 1 = appears inside a word, 0 = some word is missing.
 * The weakest word decides the score, so every word has to match.
 */
export function matchScore(text: string, words: string[]): number {
  if (words.length === 0 || text === '') return 0;
  const tokens = text.split(' ');
  let weakest = Number.POSITIVE_INFINITY;
  for (const word of words) {
    let score = 0;
    if (text.startsWith(word)) score = 3;
    else if (tokens.some((t) => t.startsWith(word))) score = 2;
    else if (text.includes(word)) score = 1;
    if (score === 0) return 0;
    weakest = Math.min(weakest, score);
  }
  return weakest;
}

export interface SongHit {
  song: Song;
  score: number;
}
export interface ArtistHit {
  name: string;
  count: number;
  score: number;
}
export interface AlbumHit {
  name: string;
  artist: string;
  count: number;
  score: number;
  /** A song from the album, used for its cover. */
  sample: Song;
}
export interface PlaylistHit {
  playlist: Playlist;
  score: number;
}
export interface SearchResults {
  songs: SongHit[];
  artists: ArtistHit[];
  albums: AlbumHit[];
  playlists: PlaylistHit[];
}

const EMPTY: SearchResults = { songs: [], artists: [], albums: [], playlists: [] };

const byScoreThenName = (a: { score: number; name: string }, b: { score: number; name: string }) =>
  b.score - a.score || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/** Grouped, ranked results for a query. An empty query gives no results. */
export function runSearch(
  index: IndexedSong[],
  playlists: Playlist[],
  query: string,
): SearchResults {
  const words = parseQuery(query);
  if (words.length === 0) return EMPTY;

  const songs: SongHit[] = [];
  const artists = new Map<string, ArtistHit>();
  const albums = new Map<string, AlbumHit>();

  for (const entry of index) {
    const { song } = entry;
    const score = matchScore(entry.all, words);
    if (score > 0) songs.push({ song, score });

    const artistScore = matchScore(entry.artist, words);
    if (artistScore > 0) {
      const hit = artists.get(entry.artist);
      if (hit) {
        hit.count++;
        hit.score = Math.max(hit.score, artistScore);
      } else {
        artists.set(entry.artist, { name: song.artist, count: 1, score: artistScore });
      }
    }

    const albumScore = matchScore(entry.album, words);
    if (albumScore > 0) {
      const key = `${entry.album}\u0000${entry.artist}`;
      const hit = albums.get(key);
      if (hit) {
        hit.count++;
        hit.score = Math.max(hit.score, albumScore);
      } else {
        albums.set(key, {
          name: song.album ?? '',
          artist: song.artist,
          count: 1,
          score: albumScore,
          sample: song,
        });
      }
    }
  }

  const playlistHits: PlaylistHit[] = [];
  for (const playlist of playlists) {
    const score = matchScore(normalizeText(playlist.name), words);
    if (score > 0) playlistHits.push({ playlist, score });
  }

  songs.sort((a, b) => b.score - a.score || a.song.title.localeCompare(b.song.title));
  const artistList = [...artists.values()].sort(byScoreThenName);
  const albumList = [...albums.values()].sort(byScoreThenName);
  playlistHits.sort((a, b) => b.score - a.score || a.playlist.name.localeCompare(b.playlist.name));

  return { songs, artists: artistList, albums: albumList, playlists: playlistHits };
}
