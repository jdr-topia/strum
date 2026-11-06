import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthContext';
import type { AuthUser } from '@/types/user';

export const testUser: AuthUser = {
  uid: 'u1',
  displayName: 'Asha Test',
  email: 'asha@example.com',
  emailVerified: true,
  photoURL: null,
};

export function fakeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: 'ready',
    user: testUser,
    signIn: vi.fn(() => Promise.resolve()),
    signOut: vi.fn(() => Promise.resolve()),
    retry: vi.fn(),
    ...overrides,
  };
}

/** Provides a fake auth context so components can render without Firebase. */
export function FakeAuthProvider({
  value,
  children,
}: {
  value: AuthContextValue;
  children: ReactNode;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
