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
import { publicSongFields } from '@/features/discover/publicSongs';
import { buildSearchKeywords } from '@/lib/keywords';
import type { NewSong, Song, SongOwner } from '@/types/song';

/** Firestore allows 500 writes per batch. A song can take two (private + public); stay well under. */
const BATCH_SIZE = 200;

const songsRef = (uid: string) => collection(db, 'users', uid, 'songs');
const songRef = (uid: string, songId: string) => doc(db, 'users', uid, 'songs', songId);
/** Discover mirror of a public song (docs/README.md, Data model). */
const publicSongRef = (songId: string) => doc(db, 'publicSongs', songId);

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
    isPublic: data.isPublic === true,
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
    isPublic: false,
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

/**
 * Updates editable metadata and recomputes search keywords. `isPublic` (optional) shares or
 * unshares the song in the same batch; a song that stays public gets its Discover copy updated.
 */
export async function updateSongInfo(
  owner: SongOwner,
  song: Song,
  patch: SongInfoPatch & { isPublic?: boolean },
): Promise<void> {
  const { isPublic = song.isPublic, ...info } = patch;
  const fields = {
    ...info,
    searchKeywords: buildSearchKeywords(info.title, info.artist, info.album),
  };
  const next: Song = { ...song, ...fields, isPublic };
  const batch = writeBatch(db);
  batch.update(songRef(owner.uid, song.id), { ...fields, isPublic });
  if (isPublic && song.isPublic) {
    batch.update(publicSongRef(song.id), publicSongFields(next, owner));
  } else if (isPublic) {
    batch.set(publicSongRef(song.id), {
      ...publicSongFields(next, owner),
      sharedAt: serverTimestamp(),
    });
  } else if (song.isPublic) {
    batch.delete(publicSongRef(song.id));
  }
  await batch.commit();
}

/**
 * Shares songs in Discover (or stops sharing them). The private flag and the `publicSongs`
 * copy are written in one batch, so they can't drift apart. Songs already in the wanted state
 * (and deleted songs) are skipped.
 */
export async function setSongsPublic(
  owner: SongOwner,
  songs: Song[],
  isPublic: boolean,
): Promise<void> {
  const todo = songs.filter((s) => !s.deleted && s.isPublic !== isPublic);
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const song of todo.slice(i, i + BATCH_SIZE)) {
      batch.update(songRef(owner.uid, song.id), { isPublic });
      if (isPublic) {
        batch.set(publicSongRef(song.id), {
          ...publicSongFields(song, owner),
          sharedAt: serverTimestamp(),
        });
      } else {
        batch.delete(publicSongRef(song.id));
      }
    }
    await batch.commit();
  }
}

async function batchApply(ids: string[], apply: (batch: WriteBatch, id: string) => void) {
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    ids.slice(i, i + BATCH_SIZE).forEach((id) => apply(batch, id));
    await batch.commit();
  }
}

/**
 * Soft-deletes songs, removes them from every playlist of this user that contains them, and
 * stops sharing them (the Discover copy is deleted and `isPublic` set to false).
 * Restoring a song does not put it back into playlists or Discover.
 * Other users' playlists keep the id; their playlist page shows it as no longer available.
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

  await batchApply(songIds, (batch, id) => {
    batch.update(songRef(uid, id), { deleted: true, isPublic: false });
    // The rules allow deleting a missing doc, so private songs need no extra read.
    batch.delete(publicSongRef(id));
  });
}

export async function restoreSongs(uid: string, songIds: string[]): Promise<void> {
  await batchApply(songIds, (batch, id) => batch.update(songRef(uid, id), { deleted: false }));
}

/**
 * Removes the Firestore docs for good (and any Discover copy left over).
 * Their Cloudinary assets must be removed separately.
 */
export async function hardDeleteSongs(uid: string, songIds: string[]): Promise<void> {
  await batchApply(songIds, (batch, id) => {
    batch.delete(songRef(uid, id));
    batch.delete(publicSongRef(id));
  });
}
