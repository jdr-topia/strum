import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { AuthUser } from '@/types/user';
import { allowlistId } from './authHelpers';

/** True when `allowedUsers/{email}` exists. Rules only let a user read their own entry. */
export async function isEmailAllowed(email: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'allowedUsers', allowlistId(email)));
  return snap.exists();
}

/**
 * Creates `users/{uid}` on first sign-in; afterwards keeps name/photo in sync with Google.
 * `createdAt` is only written once.
 */
export async function ensureUserProfile(user: AuthUser): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const profile = {
    displayName: user.displayName ?? user.email ?? 'Friend',
    email: (user.email ?? '').toLowerCase(),
    photoURL: user.photoURL,
  };

  if (!snap.exists()) {
    await setDoc(ref, { ...profile, createdAt: serverTimestamp() }, { merge: true });
    return;
  }

  const data = snap.data();
  if (data.displayName !== profile.displayName || data.photoURL !== profile.photoURL) {
    await setDoc(ref, profile, { merge: true });
  }
}
