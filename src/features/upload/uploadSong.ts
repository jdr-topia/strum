import { addSong } from '@/features/library/songApi';
import type { NewSong } from '@/types/song';
import { deleteByToken, uploadToCloudinary, type CloudinaryResult } from './cloudinaryUpload';

export interface UploadSongInput {
  file: File;
  title: string;
  artist: string;
  album: string;
  /** Duration from tags/<audio> fallback; Cloudinary's value wins when it returns one. */
  durationSec: number;
  cover: Blob | null;
}

export interface UploadSongCallbacks {
  signal: AbortSignal;
  onProgress: (pct: number) => void;
  /** Audio is on Cloudinary; the Firestore write is in progress. */
  onSaving: () => void;
}

export const SAVE_FAILED_MESSAGE = "Couldn't save the song to your library. Please try again.";

/** Removes assets that were uploaded but never got a Firestore doc. Best effort. */
async function removeOrphans(results: (CloudinaryResult | null)[]): Promise<void> {
  await Promise.all(
    results.map((r) => (r?.delete_token ? deleteByToken(r.delete_token) : Promise.resolve(false))),
  );
}

/**
 * Upload pipeline for one song: cover (optional) → audio → Firestore doc.
 * If anything fails, uploaded assets are removed with their delete tokens so nothing is orphaned.
 */
export async function uploadSong(
  uid: string,
  input: UploadSongInput,
  cb: UploadSongCallbacks,
): Promise<void> {
  const tags = ['strum', uid];
  const context = { title: input.title, artist: input.artist };
  let cover: CloudinaryResult | null = null;
  let audio: CloudinaryResult | null = null;

  try {
    if (input.cover) {
      cover = await uploadToCloudinary(input.cover, {
        resourceType: 'image',
        folder: `strum/covers/${uid}`,
        filename: 'cover',
        tags,
        context,
        signal: cb.signal,
      });
    }
    audio = await uploadToCloudinary(input.file, {
      resourceType: 'video',
      folder: `strum/songs/${uid}`,
      filename: input.file.name,
      tags,
      context,
      onProgress: cb.onProgress,
      signal: cb.signal,
    });
  } catch (err) {
    await removeOrphans([cover, audio]);
    throw err;
  }

  const song: NewSong = {
    title: input.title.trim() || 'Untitled',
    artist: input.artist.trim() || 'Unknown Artist',
    album: input.album.trim() || null,
    durationSec: audio.duration ?? input.durationSec,
    cloudinaryPublicId: audio.public_id,
    audioUrl: audio.secure_url,
    format: audio.format,
    bytes: audio.bytes,
    coverPublicId: cover?.public_id ?? null,
    coverUrl: cover?.secure_url ?? null,
  };

  cb.onSaving();
  try {
    await addSong(uid, song);
  } catch {
    await removeOrphans([cover, audio]);
    throw new Error(SAVE_FAILED_MESSAGE);
  }
}
