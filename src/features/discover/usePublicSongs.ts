import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useSongs } from '@/features/library/useSongs';
import type { Song } from '@/types/song';
import { subscribePublicSongs } from './publicSongApi';
import { mergePlayable, type PublicSong } from './publicSongs';

export interface PublicSongsState {
  songs: PublicSong[];
  loading: boolean;
  error: Error | null;
}

/** Live list of public songs from every user (Discover). */
export function usePublicSongs(): PublicSongsState {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [data, setData] = useState<{ songs: PublicSong[]; error: Error | null } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribePublicSongs(
      (songs) => setData({ songs, error: null }),
      (error) => setData((prev) => ({ songs: prev?.songs ?? [], error })),
    );
  }, [uid]);

  return {
    songs: data?.songs ?? [],
    error: data?.error ?? null,
    loading: data === null && !!uid,
  };
}

/**
 * Songs a playlist can resolve to: the user's library plus other people's public songs.
 * If Discover fails to load, playlists still show the user's own songs.
 */
export function usePlayableSongs(): { songs: Song[]; loading: boolean } {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const library = useSongs();
  const shared = usePublicSongs();
  const songs = useMemo(
    () => mergePlayable(library.songs, shared.songs, uid),
    [library.songs, shared.songs, uid],
  );
  return { songs, loading: library.loading || (shared.loading && !shared.error) };
}
