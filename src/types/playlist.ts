import type { Timestamp } from 'firebase/firestore';

/** `users/{uid}/playlists/{playlistId}` (see docs/README.md → Data model). */
export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  /** Custom cover. Null means the playlist shows a mosaic of its first songs' covers. */
  coverUrl: string | null;
  folderId: string | null;
  /** Ordered. A song appears at most once. */
  songIds: string[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}
