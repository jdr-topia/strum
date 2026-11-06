import type { AuthUser } from '@/types/user';

export interface AccessDeps {
  isEmailAllowed: (email: string) => Promise<boolean>;
  ensureUserProfile: (user: AuthUser) => Promise<void>;
}

/**
 * Decides what a signed-in user may do. Throws if Firestore can't be reached,
 * so the caller can show a retry screen instead of wrongly saying "not invited".
 */
export async function checkAccess(
  user: AuthUser,
  deps: AccessDeps,
): Promise<'ready' | 'notAllowed'> {
  // Rules require a verified email; Google accounts always are, but don't let others through.
  if (!user.email || !user.emailVerified) return 'notAllowed';
  if (!(await deps.isEmailAllowed(user.email))) return 'notAllowed';
  await deps.ensureUserProfile(user);
  return 'ready';
}
