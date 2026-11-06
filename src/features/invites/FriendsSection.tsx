import { UserMinus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { ConfirmModal } from '@/components/ConfirmModal';
import { formatInviteCode } from './inviteCode';
import { removeFriend } from './inviteApi';
import type { Friend } from '@/types/invite';
import { useFriends } from './useInvitesAndFriends';

/** Admin tool: see who has access and remove them. Admins can't remove themselves. */
export function FriendsSection({ adminEmail }: { adminEmail: string }) {
  const { items, error } = useFriends(true);
  const [removing, setRemoving] = useState<Friend | null>(null);

  const sorted = useMemo(() => [...items].sort((a, b) => a.email.localeCompare(b.email)), [items]);

  return (
    <section aria-labelledby="friends-heading" className="space-y-4">
      <div>
        <h2 id="friends-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Users className="size-5 text-accent" aria-hidden />
          Friends
        </h2>
        <p className="mt-1 text-sm text-muted">
          Everyone who can sign in. Removing someone stops their access straight away; their songs
          stay in the database.
        </p>
      </div>

      {error && (
        <p className="text-sm text-danger">Couldn't load friends. Check your connection.</p>
      )}

      <ul className="divide-y divide-border rounded-xl border border-border">
        {sorted.map((friend) => {
          const isMe = friend.email === adminEmail.toLowerCase();
          return (
            <li key={friend.email} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {friend.email}
                  {isMe && <span className="ml-2 text-xs text-muted">(you)</span>}
                </p>
                <p className="truncate text-xs text-muted">
                  {friend.note ??
                    (friend.inviteCode
                      ? `Joined with ${formatInviteCode(friend.inviteCode)}`
                      : 'Added by you')}
                </p>
              </div>
              {!isMe && (
                <Button
                  variant="ghost"
                  className="h-8 px-3 text-danger"
                  aria-label={`Remove ${friend.email}`}
                  onClick={() => setRemoving(friend)}
                >
                  <UserMinus className="size-4" aria-hidden />
                  Remove
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {removing && (
        <ConfirmModal
          open
          onClose={() => setRemoving(null)}
          title={`Remove ${removing.email}?`}
          description="They can't sign in to Strum after this. Their songs stay in the database, and you can add them back with a new invite."
          confirmLabel="Remove"
          onConfirm={() => removeFriend(removing.email)}
        />
      )}
    </section>
  );
}
