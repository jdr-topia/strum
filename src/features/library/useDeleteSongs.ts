import { useState } from 'react';
import { toast } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { restoreSongs, softDeleteSongs } from './songApi';

/**
 * Soft-deletes songs (also removing them from playlists) and offers a 5-second undo.
 * Undo restores the songs but not their playlist memberships.
 */
export function useDeleteSongs(): {
  deleteSongs: (ids: string[], label: string) => Promise<boolean>;
  busy: boolean;
} {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [busy, setBusy] = useState(false);

  const deleteSongs = async (ids: string[], label: string): Promise<boolean> => {
    if (!uid || ids.length === 0) return false;
    setBusy(true);
    try {
      await softDeleteSongs(uid, ids);
      toast.withAction(label, {
        label: 'Undo',
        onClick: () => {
          restoreSongs(uid, ids).catch(() =>
            toast.error("Couldn't undo. Try again from Settings."),
          );
        },
      });
      return true;
    } catch {
      toast.error("Couldn't delete. Check your connection and try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { deleteSongs, busy };
}
