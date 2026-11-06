import { useState, type FormEvent } from 'react';
import { Button } from '@/components/Button';
import { toast } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { friendlyError } from '@/lib/errors';
import { redeemInvite } from './inviteApi';

const inputClass =
  'h-11 w-full rounded-lg border border-border bg-surface-2 px-3 text-center font-mono text-base tracking-widest uppercase outline-none focus:border-accent';

/** On the "not on the list" screen: enter an invite code to join. */
export function RedeemInviteForm() {
  const { user, retry } = useAuth();
  const email = user?.email ?? null;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!email) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await redeemInvite(email, code);
      toast.success("You're in!");
      retry();
    } catch (err) {
      setError(friendlyError(err, "Couldn't use that code. Check your connection and try again."));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-xs space-y-2">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Have an invite code?</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABCD-EFGH-JKLM"
          autoComplete="off"
          spellCheck={false}
          maxLength={20}
          className={inputClass}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy || code.trim() === ''}>
        {busy ? 'Checking…' : 'Join Strum'}
      </Button>
    </form>
  );
}
