import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { ValidationError } from '@/lib/errors';
import type { Playlist } from '@/types/playlist';

const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;
const MAX_SONGS = 5000;

const playlistsRef = (uid: string) => collection(db, 'users', uid, 'playlists');
const playlistRef = (uid: string, id: string) => doc(db, 'users', uid, 'playlists', id);

export function toPlaylist(id: string, data: DocumentData): Playlist {
  return {
    id,
    name: data.name ?? '',
    description: data.description ?? null,
    coverUrl: data.coverUrl ?? null,
    folderId: data.folderId ?? null,
    songIds: Array.isArray(data.songIds) ? data.songIds : [],
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

function mapSnapshot(snap: QuerySnapshot<DocumentData>): Playlist[] {
  return snap.docs.map((d) => toPlaylist(d.id, d.data()));
}

/** Live list of the user's playlists (small collection, loaded in full). Returns the unsubscribe function. */
export function subscribePlaylists(
  uid: string,
  onNext: (playlists: Playlist[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    playlistsRef(uid),
    (snap) => onNext(mapSnapshot(snap)),
    (err) => onError(err),
  );
}

/** Trims and checks a playlist or folder name. Throws ValidationError with a friendly message. */
export function cleanName(name: string): string {
  const clean = name.trim();
  if (!clean) throw new ValidationError('Give it a name first.');
  if (clean.length > MAX_NAME) {
    throw new ValidationError(`Names can be up to ${MAX_NAME} characters.`);
  }
  return clean;
}

export async function createPlaylist(
  uid: string,
  name: string,
  folderId: string | null = null,
): Promise<string> {
  const ref = await addDoc(playlistsRef(uid), {
    name: cleanName(name),
    description: null,
    coverUrl: null,
    folderId,
    songIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function renamePlaylist(uid: string, id: string, name: string): Promise<void> {
  await updateDoc(playlistRef(uid, id), { name: cleanName(name), updatedAt: serverTimestamp() });
}

export async function setDescription(uid: string, id: string, description: string): Promise<void> {
  const clean = description.trim();
  if (clean.length > MAX_DESCRIPTION) {
    throw new ValidationError(`Descriptions can be up to ${MAX_DESCRIPTION} characters.`);
  }
  await updateDoc(playlistRef(uid, id), {
    description: clean || null,
    updatedAt: serverTimestamp(),
  });
}

/** Appends songs. arrayUnion skips ids already in the playlist, so nothing is duplicated. */
export async function addSongs(uid: string, id: string, songIds: string[]): Promise<void> {
  if (songIds.length === 0) return;
  await updateDoc(playlistRef(uid, id), {
    songIds: arrayUnion(...songIds),
    updatedAt: serverTimestamp(),
  });
}

export async function removeSong(uid: string, id: string, songId: string): Promise<void> {
  await updateDoc(playlistRef(uid, id), {
    songIds: arrayRemove(songId),
    updatedAt: serverTimestamp(),
  });
}

/** Overwrites the order. The caller should update the UI first and roll back on failure. */
export async function reorderSongs(uid: string, id: string, songIds: string[]): Promise<void> {
  if (songIds.length > MAX_SONGS) throw new ValidationError('This playlist is too long.');
  await updateDoc(playlistRef(uid, id), { songIds, updatedAt: serverTimestamp() });
}

export async function movePlaylist(
  uid: string,
  id: string,
  folderId: string | null,
): Promise<void> {
  await updateDoc(playlistRef(uid, id), { folderId, updatedAt: serverTimestamp() });
}

export async function deletePlaylist(uid: string, id: string): Promise<void> {
  await deleteDoc(playlistRef(uid, id));
}

/** Copies a playlist (same songs, folder and description) under a new name. Songs are not touched. */
export async function duplicatePlaylist(uid: string, playlist: Playlist): Promise<string> {
  const name = `${playlist.name} (copy)`.slice(0, MAX_NAME);
  const ref = await addDoc(playlistsRef(uid), {
    name,
    description: playlist.description,
    coverUrl: playlist.coverUrl,
    folderId: playlist.folderId,
    songIds: [...playlist.songIds],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
