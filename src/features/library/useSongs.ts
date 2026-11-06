import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import type { Song } from '@/types/song';
import { subscribeSongs } from './songApi';

export interface SongsState {
  songs: Song[];
  loading: boolean;
  error: Error | null;
}

/** Live list of the signed-in user's songs (`deleted=false` by default). */
export function useSongs(deleted = false): SongsState {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [data, setData] = useState<{ songs: Song[]; error: Error | null } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribeSongs(
      uid,
      deleted,
      (songs) => setData({ songs, error: null }),
      (error) => setData((prev) => ({ songs: prev?.songs ?? [], error })),
    );
  }, [uid, deleted]);

  return {
    songs: data?.songs ?? [],
    error: data?.error ?? null,
    loading: data === null && !!uid,
  };
}
