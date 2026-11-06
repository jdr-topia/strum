import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import type { Playlist } from '@/types/playlist';
import { subscribePlaylists } from './playlistApi';

export interface PlaylistsState {
  playlists: Playlist[];
  loading: boolean;
  error: Error | null;
}

/** Live list of the signed-in user's playlists. */
export function usePlaylists(): PlaylistsState {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [data, setData] = useState<{ playlists: Playlist[]; error: Error | null } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribePlaylists(
      uid,
      (playlists) => setData({ playlists, error: null }),
      (error) => setData((prev) => ({ playlists: prev?.playlists ?? [], error })),
    );
  }, [uid]);

  return {
    playlists: data?.playlists ?? [],
    error: data?.error ?? null,
    loading: data === null && !!uid,
  };
}
