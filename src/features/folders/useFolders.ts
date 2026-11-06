import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import type { Folder } from '@/types/folder';
import { subscribeFolders } from './folderApi';

export interface FoldersState {
  folders: Folder[];
  loading: boolean;
  error: Error | null;
}

/** Live list of the signed-in user's folders. */
export function useFolders(): FoldersState {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [data, setData] = useState<{ folders: Folder[]; error: Error | null } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribeFolders(
      uid,
      (folders) => setData({ folders, error: null }),
      (error) => setData((prev) => ({ folders: prev?.folders ?? [], error })),
    );
  }, [uid]);

  return {
    folders: data?.folders ?? [],
    error: data?.error ?? null,
    loading: data === null && !!uid,
  };
}
