import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useSongs } from '@/features/library/useSongs';
import type { Song } from '@/types/song';
import { loadLastQueue, saveLastQueue } from './playerApi';
import { loadLocalQueue, saveLocalQueue, type QueueSnapshot } from './playerPersistence';
import { usePlayerStore } from './playerStore';

const SAVE_INTERVAL_MS = 10_000;

/** Last saved state, so a paused player doesn't write to Firestore every interval. */
let lastSavedKey = '';

/**
 * Maps saved song ids onto the live library, so songs deleted since the save are dropped
 * and the saved song is still the one selected.
 */
function resolveSnapshot(
  songIds: string[],
  index: number,
  positionSec: number,
  library: Song[],
  source: QueueSnapshot['source'],
): QueueSnapshot | null {
  const live = new Map(library.map((s) => [s.id, s]));
  const kept = songIds.map((id) => live.get(id)).filter((s): s is Song => !!s);
  if (kept.length === 0) return null;
  const wantedId = songIds[index];
  const newIndex = Math.max(
    0,
    kept.findIndex((s) => s.id === wantedId),
  );
  return { songs: kept, index: newIndex, positionSec, source };
}

/** Restores the last queue once per session: this device first, then the cross-device copy. */
async function restoreQueue(uid: string, library: Song[]): Promise<void> {
  if (usePlayerStore.getState().queue.length > 0) return;

  const local = loadLocalQueue();
  if (local) {
    const snap = resolveSnapshot(
      local.songs.map((s) => s.id),
      local.index,
      local.positionSec,
      library,
      local.source,
    );
    if (snap) usePlayerStore.getState().restore(snap);
    return;
  }

  // Offline or failed read: nothing to restore yet.
  const remote = await loadLastQueue(uid).catch(() => null);
  if (!remote) return;
  const snap = resolveSnapshot(remote.songIds, remote.index, remote.positionSec, library, null);
  if (snap) usePlayerStore.getState().restore(snap);
}

function saveNow(uid: string): void {
  const s = usePlayerStore.getState();
  if (s.queue.length === 0) return;

  const key = `${s.index}|${Math.round(s.positionSec)}|${s.queue.length}|${s.queue[s.index]?.id}`;
  saveLocalQueue({ songs: s.queue, index: s.index, positionSec: s.positionSec, source: s.source });
  if (key === lastSavedKey) return;
  lastSavedKey = key;
  saveLastQueue(uid, {
    songIds: s.queue.map((x) => x.id),
    index: s.index,
    positionSec: s.positionSec,
  }).catch(() => {
    lastSavedKey = ''; // retry on the next tick
  });
}

/**
 * Mount once inside the signed-in layout. Restores the queue when the library is ready and
 * saves the position every 10 s, when the page is hidden, and on unload.
 */
export function usePlayerLifecycle(): void {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { songs, loading } = useSongs();
  const restored = useRef(false);

  useEffect(() => {
    if (!uid || loading || restored.current) return;
    restored.current = true;
    void restoreQueue(uid, songs);
  }, [uid, loading, songs]);

  useEffect(() => {
    if (!uid) return;
    const save = () => saveNow(uid);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') save();
    };
    const timer = window.setInterval(save, SAVE_INTERVAL_MS);
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [uid]);
}
