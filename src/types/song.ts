import type { Timestamp } from 'firebase/firestore';

/** `users/{uid}/songs/{songId}` (see docs/README.md → Data model). */
export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  durationSec: number;
  cloudinaryPublicId: string;
  audioUrl: string;
  format: string;
  bytes: number;
  coverPublicId: string | null;
  coverUrl: string | null;
  searchKeywords: string[];
  deleted: boolean;
  /** Null only for a just-written doc whose server timestamp hasn't resolved yet. */
  createdAt: Timestamp | null;
}

/** Fields the client writes when creating a song (the id, timestamps and search keywords are added by the API). */
export type NewSong = Omit<Song, 'id' | 'deleted' | 'createdAt' | 'searchKeywords'>;
