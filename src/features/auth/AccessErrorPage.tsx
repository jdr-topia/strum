import { WifiOff } from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuth } from './useAuth';

/** Shown when the allowlist check itself failed (offline, Firestore unreachable). */
export function AccessErrorPage() {
  const { retry, signOut } = useAuth();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 p-4 text-center">
      <WifiOff className="size-12 text-muted" aria-hidden />
      <div className="max-w-sm">
        <h1 className="text-2xl font-bold">Couldn't reach Strum</h1>
        <p className="mt-2 text-sm text-muted">Check your connection and try again.</p>
      </div>
      <div className="flex gap-3">
        <Button onClick={retry}>Try again</Button>
        <Button variant="secondary" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </main>
  );
}
