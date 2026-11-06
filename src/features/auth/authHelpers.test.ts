import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/types/user';
import {
  allowlistId,
  friendlyAuthError,
  isCancelledSignIn,
  isIos,
  shouldFallBackToRedirect,
  shouldUseRedirect,
} from './authHelpers';
import { checkAccess } from './checkAccess';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';

describe('allowlistId', () => {
  it('lowercases and trims', () => {
    expect(allowlistId('  Rahul@Gmail.COM ')).toBe('rahul@gmail.com');
  });
});

describe('sign-in method', () => {
  it('detects iOS, including iPadOS desktop mode', () => {
    expect(isIos({ userAgent: IPHONE })).toBe(true);
    expect(isIos({ userAgent: MAC, maxTouchPoints: 5 })).toBe(true);
    expect(isIos({ userAgent: MAC, maxTouchPoints: 0 })).toBe(false);
    expect(isIos({ userAgent: ANDROID })).toBe(false);
  });

  it('uses redirect only in an installed iOS PWA', () => {
    expect(shouldUseRedirect({ userAgent: IPHONE, standalone: true }, false)).toBe(true);
    expect(shouldUseRedirect({ userAgent: IPHONE }, true)).toBe(true);
    expect(shouldUseRedirect({ userAgent: IPHONE }, false)).toBe(false);
    expect(shouldUseRedirect({ userAgent: ANDROID }, true)).toBe(false);
  });

  it('falls back to redirect when the popup is blocked', () => {
    expect(shouldFallBackToRedirect({ code: 'auth/popup-blocked' })).toBe(true);
    expect(shouldFallBackToRedirect({ code: 'auth/popup-closed-by-user' })).toBe(false);
    expect(shouldFallBackToRedirect(new Error('x'))).toBe(false);
  });

  it('treats a closed popup as a cancel, not an error', () => {
    expect(isCancelledSignIn({ code: 'auth/popup-closed-by-user' })).toBe(true);
    expect(isCancelledSignIn({ code: 'auth/network-request-failed' })).toBe(false);
  });

  it('maps errors to friendly messages', () => {
    expect(friendlyAuthError({ code: 'auth/network-request-failed' })).toMatch(/connection/);
    expect(friendlyAuthError({ code: 'auth/unauthorized-domain' })).toMatch(/web address/);
    expect(friendlyAuthError('weird')).toBe('Sign-in failed. Please try again.');
  });
});

describe('checkAccess', () => {
  const user: AuthUser = {
    uid: 'u1',
    displayName: 'A',
    email: 'A@x.com',
    emailVerified: true,
    photoURL: null,
  };

  function deps(allowed: boolean) {
    return {
      isEmailAllowed: vi.fn(() => Promise.resolve(allowed)),
      ensureUserProfile: vi.fn(() => Promise.resolve()),
    };
  }

  it('lets allowlisted users in and ensures their profile', async () => {
    const d = deps(true);
    await expect(checkAccess(user, d)).resolves.toBe('ready');
    expect(d.isEmailAllowed).toHaveBeenCalledWith('A@x.com');
    expect(d.ensureUserProfile).toHaveBeenCalledWith(user);
  });

  it('rejects users not on the list without creating a profile', async () => {
    const d = deps(false);
    await expect(checkAccess(user, d)).resolves.toBe('notAllowed');
    expect(d.ensureUserProfile).not.toHaveBeenCalled();
  });

  it('rejects unverified or email-less accounts without asking Firestore', async () => {
    const d = deps(true);
    await expect(checkAccess({ ...user, emailVerified: false }, d)).resolves.toBe('notAllowed');
    await expect(checkAccess({ ...user, email: null }, d)).resolves.toBe('notAllowed');
    expect(d.isEmailAllowed).not.toHaveBeenCalled();
  });

  it('propagates Firestore failures so the UI can offer a retry', async () => {
    const d = { ...deps(true), isEmailAllowed: vi.fn(() => Promise.reject(new Error('offline'))) };
    await expect(checkAccess(user, d)).rejects.toThrow('offline');
  });
});
