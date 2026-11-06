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
  /** Shared in Discover (mirrored to `publicSongs/{songId}`). */
  isPublic: boolean;
  /**
   * Set only on songs read from `publicSongs` (Discover). Absent on the signed-in user's own
   * library songs, which are always theirs.
   */
  owner?: SongOwner;
  /** Null only for a just-written doc whose server timestamp hasn't resolved yet. */
  createdAt: Timestamp | null;
}

/** Who shared a public song. Only the display name is copied, never the email. */
export interface SongOwner {
  uid: string;
  name: string;
}

/** Fields the client writes when creating a song (the id, timestamps and search keywords are added by the API). */
export type NewSong = Omit<
  Song,
  'id' | 'deleted' | 'isPublic' | 'owner' | 'createdAt' | 'searchKeywords'
>;
