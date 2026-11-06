import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { shouldFallBackToRedirect, shouldUseRedirect } from './authHelpers';

function provider(): GoogleAuthProvider {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
}

function isStandaloneDisplay(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
}

/** Popup on most devices; redirect on iOS installed PWAs or when the popup is blocked. */
export async function signInWithGoogle(): Promise<void> {
  if (shouldUseRedirect(navigator as Navigator & { standalone?: boolean }, isStandaloneDisplay())) {
    await signInWithRedirect(auth, provider());
    return;
  }
  try {
    await signInWithPopup(auth, provider());
  } catch (error) {
    if (shouldFallBackToRedirect(error)) {
      await signInWithRedirect(auth, provider());
      return;
    }
    throw error;
  }
}

/** Finishes a redirect sign-in after the page reloads. Resolves quietly when there is none. */
export async function completeRedirectSignIn(): Promise<void> {
  await getRedirectResult(auth);
}

export function signOutUser(): Promise<void> {
  return signOut(auth);
}
