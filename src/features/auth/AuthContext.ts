import { createContext } from 'react';
import type { AuthUser } from '@/types/user';

/**
 * - loading: waiting for Firebase / the allowlist check
 * - signedOut: no Google account
 * - notAllowed: signed in, but not in allowedUsers (or email not verified)
 * - error: signed in, but the allowlist check failed (e.g. offline on first launch)
 * - ready: allowed, profile ensured
 */
export type AuthStatus = 'loading' | 'signedOut' | 'notAllowed' | 'error' | 'ready';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-run the allowlist check after an `error`. */
  retry: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
