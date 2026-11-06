import { MailX } from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuth } from './useAuth';

export function NotInvitedPage() {
  const { user, signOut } = useAuth();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 p-4 text-center">
      <MailX className="size-12 text-muted" aria-hidden />
      <div className="max-w-sm">
        <h1 className="text-2xl font-bold">You're not on the list</h1>
        <p className="mt-2 text-sm text-muted">
          Strum is invite-only.
          {user?.email && (
            <>
              {' '}
              <span className="font-medium break-all text-fg">{user.email}</span> hasn't been added
              yet.
            </>
          )}{' '}
          Ask the owner to add you, or sign in with a different Google account.
        </p>
      </div>
      <Button variant="secondary" onClick={() => void signOut()}>
        Sign out
      </Button>
    </main>
  );
}
