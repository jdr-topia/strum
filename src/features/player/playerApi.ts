import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

/** Cross-device resume point, stored on `users/{uid}.lastQueue` (see docs/README.md). */
export interface RemoteQueue {
  songIds: string[];
  index: number;
  positionSec: number;
}

export async function saveLastQueue(uid: string, queue: RemoteQueue): Promise<void> {
  await setDoc(doc(db, 'users', uid), { lastQueue: queue }, { merge: true });
}

export async function loadLastQueue(uid: string): Promise<RemoteQueue | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  const value = snap.data()?.lastQueue as Partial<RemoteQueue> | undefined;
  if (!value || !Array.isArray(value.songIds)) return null;
  return {
    songIds: value.songIds,
    index: typeof value.index === 'number' ? value.index : 0,
    positionSec: typeof value.positionSec === 'number' ? value.positionSec : 0,
  };
}
