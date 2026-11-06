import { useEffect, useState } from 'react';
import type { Friend, Invite } from '@/types/invite';
import { subscribeFriends, subscribeInvites } from './inviteApi';

interface Listed<T> {
  items: T[];
  error: Error | null;
}

/** Live invites. Only subscribes when `enabled` (admins). */
export function useInvites(enabled: boolean): Listed<Invite> {
  const [state, setState] = useState<Listed<Invite>>({ items: [], error: null });
  useEffect(() => {
    if (!enabled) return;
    return subscribeInvites(
      (items) => setState({ items, error: null }),
      (error) => setState((prev) => ({ items: prev.items, error })),
    );
  }, [enabled]);
  return state;
}

/** Live friends list. Only subscribes when `enabled` (admins). */
export function useFriends(enabled: boolean): Listed<Friend> {
  const [state, setState] = useState<Listed<Friend>>({ items: [], error: null });
  useEffect(() => {
    if (!enabled) return;
    return subscribeFriends(
      (items) => setState({ items, error: null }),
      (error) => setState((prev) => ({ items: prev.items, error })),
    );
  }, [enabled]);
  return state;
}
