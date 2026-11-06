import { onAuthStateChanged, type User } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from '@/components/toastStore';
import { auth } from '@/config/firebase';
import type { AuthUser } from '@/types/user';
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext';
import { ensureUserProfile, isEmailAllowed } from './authApi';
import { friendlyAuthError, isCancelledSignIn } from './authHelpers';
import { checkAccess } from './checkAccess';
import { completeRedirectSignIn, signInWithGoogle, signOutUser } from './signIn';

function toAuthUser(u: User): AuthUser {
  return {
    uid: u.uid,
    displayName: u.displayName,
    email: u.email,
    emailVerified: u.emailVerified,
    photoURL: u.photoURL,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Ignore results of a check that finished after the user changed (e.g. signed out mid-check).
  const checkId = useRef(0);

  useEffect(() => {
    completeRedirectSignIn().catch((error: unknown) => {
      if (!isCancelledSignIn(error)) toast.error(friendlyAuthError(error));
    });
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (fbUser) => {
      const id = ++checkId.current;
      if (!fbUser) {
        setUser(null);
        setStatus('signedOut');
        return;
      }
      const next = toAuthUser(fbUser);
      setUser(next);
      setStatus('loading');
      checkAccess(next, { isEmailAllowed, ensureUserProfile })
        .then((result) => {
          if (id === checkId.current) setStatus(result);
        })
        .catch((error: unknown) => {
          if (id !== checkId.current) return;
          console.error(error);
          setStatus('error');
        });
    });
    // `attempt` re-subscribes, which re-runs the check for the current user.
  }, [attempt]);

  const signIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      if (!isCancelledSignIn(error)) toast.error(friendlyAuthError(error));
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await signOutUser();
    } catch (error) {
      toast.error(friendlyAuthError(error));
    }
  }, []);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signOut, retry }),
    [status, user, signIn, signOut, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
