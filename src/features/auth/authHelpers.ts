/** Pure auth helpers (no Firebase imports) so they can be unit-tested. */

/** Allowlist doc IDs are lowercase emails. */
export function allowlistId(email: string): string {
  return email.trim().toLowerCase();
}

interface NavigatorLike {
  userAgent: string;
  maxTouchPoints?: number;
  standalone?: boolean;
}

/** iPhone/iPad, including iPadOS which reports itself as a Mac with touch. */
export function isIos(nav: NavigatorLike): boolean {
  return (
    /iPad|iPhone|iPod/.test(nav.userAgent) ||
    (/Macintosh/.test(nav.userAgent) && (nav.maxTouchPoints ?? 0) > 1)
  );
}

/**
 * Popups don't work in an installed iOS PWA, so go straight to redirect there.
 * Everywhere else we try a popup first and fall back to redirect if it's blocked.
 */
export function shouldUseRedirect(nav: NavigatorLike, displayModeStandalone: boolean): boolean {
  return isIos(nav) && (nav.standalone === true || displayModeStandalone);
}

/** Firebase error codes that mean "popup can't be used here — try redirect". */
const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-environment',
  'auth/web-storage-unsupported',
]);

/** Codes that mean the user simply closed/cancelled — no error toast. */
const CANCELLED_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

export function errorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

export function shouldFallBackToRedirect(error: unknown): boolean {
  const code = errorCode(error);
  return code !== undefined && POPUP_FALLBACK_CODES.has(code);
}

export function isCancelledSignIn(error: unknown): boolean {
  const code = errorCode(error);
  return code !== undefined && CANCELLED_CODES.has(code);
}

/** Friendly message for the toast. */
export function friendlyAuthError(error: unknown): string {
  switch (errorCode(error)) {
    case 'auth/network-request-failed':
    case 'unavailable':
      return "Couldn't reach the server. Check your connection and try again.";
    case 'auth/unauthorized-domain':
      return "Sign-in isn't enabled for this web address yet. Ask the owner to add it in Firebase.";
    case 'auth/operation-not-allowed':
      return "Google sign-in isn't turned on for Strum yet.";
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'permission-denied':
      return "Strum couldn't check your invite. Try signing in again.";
    default:
      return 'Sign-in failed. Please try again.';
  }
}
