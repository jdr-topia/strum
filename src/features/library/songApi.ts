import {
  addDoc,
  arrayRemove,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type WriteBatch,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { buildSearchKeywords } from '@/lib/keywords';
import type { NewSong, Song } from '@/types/song';

/** Firestore allows 500 writes per batch; stay well under. */
const BATCH_SIZE = 400;

const songsRef = (uid: string) => collection(db, 'users', uid, 'songs');
const songRef = (uid: string, songId: string) => doc(db, 'users', uid, 'songs', songId);

export function toSong(id: string, data: DocumentData): Song {
  return {
    id,
    title: data.title,
    artist: data.artist,
    album: data.album ?? null,
    durationSec: data.durationSec,
    cloudinaryPublicId: data.cloudinaryPublicId,
    audioUrl: data.audioUrl,
    format: data.format,
    bytes: data.bytes,
    coverPublicId: data.coverPublicId ?? null,
    coverUrl: data.coverUrl ?? null,
    searchKeywords: data.searchKeywords ?? [],
    deleted: data.deleted === true,
    createdAt: data.createdAt ?? null,
  };
}

function mapSnapshot(snap: QuerySnapshot<DocumentData>): Song[] {
  return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => toSong(d.id, d.data()));
}

/** Live list of songs with the given deleted flag. Returns the unsubscribe function. */
export function subscribeSongs(
  uid: string,
  deleted: boolean,
  onNext: (songs: Song[]) => void,
  onError: (error: Error) => void,
): () => void {
  // Library (deleted=false) is ordered by the DB; the deleted list is sorted client-side,
  // which avoids a second composite index.
  const q = deleted
    ? query(songsRef(uid), where('deleted', '==', true))
    : query(songsRef(uid), where('deleted', '==', false), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onNext(mapSnapshot(snap)),
    (err) => onError(err),
  );
}

/** Creates a song doc after its audio (and cover) reached Cloudinary. Returns the new id. */
export async function addSong(uid: string, input: NewSong): Promise<string> {
  const ref = await addDoc(songsRef(uid), {
    ...input,
    searchKeywords: buildSearchKeywords(input.title, input.artist, input.album),
    deleted: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export interface SongInfoPatch {
  title: string;
  artist: string;
  album: string | null;
  coverPublicId?: string | null;
  coverUrl?: string | null;
}

/** Updates editable metadata and recomputes search keywords. */
export async function updateSongInfo(uid: string, songId: string, patch: SongInfoPatch) {
  await updateDoc(songRef(uid, songId), {
    ...patch,
    searchKeywords: buildSearchKeywords(patch.title, patch.artist, patch.album),
  });
}

async function batchApply(ids: string[], apply: (batch: WriteBatch, id: string) => void) {
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    ids.slice(i, i + BATCH_SIZE).forEach((id) => apply(batch, id));
    await batch.commit();
  }
}

/**
 * Soft-deletes songs and removes them from every playlist that contains them.
 * Restoring a song does not put it back into playlists.
 */
export async function softDeleteSongs(uid: string, songIds: string[]): Promise<void> {
  if (songIds.length === 0) return;

  const playlists = await getDocs(collection(db, 'users', uid, 'playlists'));
  const playlistRefs = playlists.docs.filter((p) => {
    const ids: unknown = p.data().songIds;
    return Array.isArray(ids) && ids.some((id) => songIds.includes(id as string));
  });

  // Playlist edits first: if this fails, the song stays visible and nothing is half-removed.
  for (const p of playlistRefs) {
    const removed = (p.data().songIds as string[]).filter((id) => songIds.includes(id));
    await updateDoc(p.ref, { songIds: arrayRemove(...removed), updatedAt: serverTimestamp() });
  }

  await batchApply(songIds, (batch, id) => batch.update(songRef(uid, id), { deleted: true }));
}

export async function restoreSongs(uid: string, songIds: string[]): Promise<void> {
  await batchApply(songIds, (batch, id) => batch.update(songRef(uid, id), { deleted: false }));
}

/** Removes the Firestore docs for good. Their Cloudinary assets must be removed separately. */
export async function hardDeleteSongs(uid: string, songIds: string[]): Promise<void> {
  await batchApply(songIds, (batch, id) => batch.delete(songRef(uid, id)));
}
