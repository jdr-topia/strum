import type { Song } from '@/types/song';

/**
 * Maps a playlist's song ids to songs from the already-loaded library, keeping playlist order.
 * Ids of songs that were deleted (or are unknown) are skipped.
 */
export function resolvePlaylistSongs(songIds: string[], library: Song[]): Song[] {
  const byId = new Map(library.map((s) => [s.id, s]));
  const out: Song[] = [];
  for (const id of songIds) {
    const song = byId.get(id);
    if (song) out.push(song);
  }
  return out;
}

export function totalDurationSec(songs: Song[]): number {
  return songs.reduce((sum, s) => sum + (s.durationSec || 0), 0);
}
