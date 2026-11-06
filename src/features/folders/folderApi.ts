import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
  type WriteBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { ValidationError } from '@/lib/errors';
import { cleanName } from '@/features/playlists/playlistApi';
import type { Folder } from '@/types/folder';
import type { Playlist } from '@/types/playlist';
import { folderCreateError, folderMoveError, nextOrder } from './folderTree';

/** Firestore allows 500 writes per batch; stay well under. */
const BATCH_SIZE = 400;

const foldersRef = (uid: string) => collection(db, 'users', uid, 'folders');
const folderRef = (uid: string, id: string) => doc(db, 'users', uid, 'folders', id);
const playlistRef = (uid: string, id: string) => doc(db, 'users', uid, 'playlists', id);

export function toFolder(id: string, data: DocumentData): Folder {
  return {
    id,
    name: data.name ?? '',
    parentId: data.parentId ?? null,
    order: typeof data.order === 'number' ? data.order : 0,
    createdAt: data.createdAt ?? null,
  };
}

function mapSnapshot(snap: QuerySnapshot<DocumentData>): Folder[] {
  return snap.docs.map((d) => toFolder(d.id, d.data()));
}

/** Live list of the user's folders. Returns the unsubscribe function. */
export function subscribeFolders(
  uid: string,
  onNext: (folders: Folder[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    foldersRef(uid),
    (snap) => onNext(mapSnapshot(snap)),
    (err) => onError(err),
  );
}

/** Creates a folder. `existing` is the user's current folders, used to check nesting and order. */
export async function createFolder(
  uid: string,
  name: string,
  parentId: string | null,
  existing: Folder[],
): Promise<string> {
  const error = folderCreateError(existing, parentId);
  if (error) throw new ValidationError(error);
  const ref = await addDoc(foldersRef(uid), {
    name: cleanName(name),
    parentId,
    order: nextOrder(existing, parentId),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function renameFolder(uid: string, id: string, name: string): Promise<void> {
  await updateDoc(folderRef(uid, id), { name: cleanName(name) });
}

/** Moves a folder to the root (`parentId` null) or inside another root folder. */
export async function moveFolder(
  uid: string,
  id: string,
  parentId: string | null,
  existing: Folder[],
): Promise<void> {
  const error = folderMoveError(existing, id, parentId);
  if (error) throw new ValidationError(error);
  await updateDoc(folderRef(uid, id), { parentId });
}

/** Writes `order` = position for each id, in the given order. */
export async function reorderFolders(uid: string, orderedIds: string[]): Promise<void> {
  await batchApply(orderedIds, (batch, id, index) => {
    batch.update(folderRef(uid, id), { order: index });
  });
}

export type DeleteFolderMode = 'move' | 'delete';

/**
 * Deletes a folder. 'move' puts its playlists and sub-folders into the folder's parent.
 * 'delete' also deletes the playlists inside it. Songs are never deleted.
 * Playlists are written before the folder doc, so a failure part-way leaves the folder to retry.
 */
export async function deleteFolder(
  uid: string,
  folder: Folder,
  folders: Folder[],
  playlists: Playlist[],
  mode: DeleteFolderMode,
): Promise<void> {
  const childFolders = folders.filter((f) => f.parentId === folder.id);
  const directPlaylists = playlists.filter((p) => p.folderId === folder.id);

  const writes: ((batch: WriteBatch) => void)[] = [];
  if (mode === 'move') {
    for (const child of childFolders) {
      writes.push((b) => b.update(folderRef(uid, child.id), { parentId: folder.parentId }));
    }
    for (const playlist of directPlaylists) {
      writes.push((b) =>
        b.update(playlistRef(uid, playlist.id), {
          folderId: folder.parentId,
          updatedAt: serverTimestamp(),
        }),
      );
    }
  } else {
    for (const child of childFolders) {
      for (const playlist of playlists.filter((p) => p.folderId === child.id)) {
        writes.push((b) => b.delete(playlistRef(uid, playlist.id)));
      }
      writes.push((b) => b.delete(folderRef(uid, child.id)));
    }
    for (const playlist of directPlaylists) {
      writes.push((b) => b.delete(playlistRef(uid, playlist.id)));
    }
  }
  writes.push((b) => b.delete(folderRef(uid, folder.id)));

  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    writes.slice(i, i + BATCH_SIZE).forEach((write) => write(batch));
    await batch.commit();
  }
}

async function batchApply(
  ids: string[],
  apply: (batch: WriteBatch, id: string, index: number) => void,
): Promise<void> {
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    ids.slice(i, i + BATCH_SIZE).forEach((id, k) => apply(batch, id, i + k));
    await batch.commit();
  }
}
