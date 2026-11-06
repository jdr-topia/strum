import { AudioLines } from 'lucide-react';
import { Button } from '@/components/Button';

/** Placeholder; Google sign-in arrives in Phase 1. */
export function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4 text-center">
      <AudioLines className="size-14 text-accent" aria-hidden />
      <div>
        <h1 className="text-3xl font-bold">Strum</h1>
        <p className="mt-2 text-sm text-muted">Your music, for you and your friends.</p>
      </div>
      <Button disabled>Sign in with Google</Button>
    </main>
  );
}
