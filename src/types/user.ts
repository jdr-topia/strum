import type { Timestamp } from 'firebase/firestore';

/** The signed-in Google account, as the app sees it. */
export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
  photoURL: string | null;
}

/** `users/{uid}` in Firestore (see docs/README.md → Data model). */
export interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt: Timestamp;
  lastQueue?: { songIds: string[]; index: number; positionSec: number };
}
