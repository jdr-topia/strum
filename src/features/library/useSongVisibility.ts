import { useState } from 'react';
import { toast } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { ownerNameFor } from '@/features/discover/publicSongs';
import type { Song } from '@/types/song';
import { setSongsPublic } from './songApi';

/** Shares songs in Discover or makes them private again, with a toast either way. */
export function useSongVisibility(): {
  setPublic: (songs: Song[], isPublic: boolean) => Promise<boolean>;
  busy: boolean;
} {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const setPublic = async (songs: Song[], isPublic: boolean): Promise<boolean> => {
    if (!user || songs.length === 0) return false;
    setBusy(true);
    try {
      await setSongsPublic({ uid: user.uid, name: ownerNameFor(user) }, songs, isPublic);
      const what = songs.length === 1 ? `“${songs[0].title}”` : `${songs.length} songs`;
      toast.success(isPublic ? `Shared ${what} in Discover` : `${what} is private again`);
      return true;
    } catch {
      toast.error(
        isPublic
          ? "Couldn't share. Check your connection and try again."
          : "Couldn't make it private. Check your connection and try again.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { setPublic, busy };
}
