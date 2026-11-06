import { Copy, Ticket, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/Button';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Select } from '@/components/Select';
import { toast } from '@/components/toastStore';
import { friendlyError } from '@/lib/errors';
import type { Invite } from '@/types/invite';
import { createInvite, revokeInvite } from './inviteApi';
import { formatInviteCode } from './inviteCode';
import { inviteProblem } from './inviteRules';
import { useInvites } from './useInvitesAndFriends';

const inputClass =
  'h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent';

const USES = [1, 5, 10] as const;
const DAYS = [1, 7, 30] as const;

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function statusOf(invite: Invite, nowMs: number): string {
  const problem = inviteProblem(
    {
      expiresAtMs: invite.expiresAt.toMillis(),
      uses: invite.uses,
      maxUses: invite.maxUses,
    },
    nowMs,
  );
  if (problem === null) {
    return `${invite.uses} of ${invite.maxUses} used · expires ${formatDate(invite.expiresAt.toMillis())}`;
  }
  return problem.includes('expired') ? 'Expired' : 'Used up';
}

/** Admin tool: create invite codes, copy them, see their status, and revoke them. */
export function InvitesSection({ adminEmail }: { adminEmail: string }) {
  const { items: invites, error } = useInvites(true);
  // Captured once per mount; fine for showing expiry dates.
  const [now] = useState(() => Date.now());
  const [note, setNote] = useState('');
  const [maxUses, setMaxUses] = useState<number>(1);
  const [days, setDays] = useState<number>(7);
  const [busy, setBusy] = useState(false);
  const [latest, setLatest] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<Invite | null>(null);

  const sorted = useMemo(
    () =>
      [...invites].sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
    [invites],
  );

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const code = await createInvite(adminEmail, { note, maxUses, days });
      setLatest(code);
      setNote('');
      toast.success('Invite created');
    } catch (err) {
      toast.error(
        friendlyError(err, "Couldn't create the invite. Check your connection and try again."),
      );
    } finally {
      setBusy(false);
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(formatInviteCode(code));
      toast.success('Invite code copied');
    } catch {
      toast.error("Couldn't copy. Select the code and copy it by hand.");
    }
  };

  return (
    <section aria-labelledby="invites-heading" className="space-y-4">
      <div>
        <h2 id="invites-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Ticket className="size-5 text-accent" aria-hidden />
          Invites
        </h2>
        <p className="mt-1 text-sm text-muted">
          Create a code and send it to a friend. They enter it on the sign-in screen and get access
          straight away.
        </p>
      </div>

      <form onSubmit={create} className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 basis-48">
          <span className="mb-1 block text-xs font-medium text-muted">
            Who is it for? (optional)
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={100}
            placeholder="e.g. Rahul"
            className={`${inputClass} w-full`}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-muted">Uses</span>
          <Select value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))}>
            {USES.map((n) => (
              <option key={n} value={n}>
                {n === 1 ? '1 person' : `Up to ${n}`}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-muted">Valid for</span>
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d === 1 ? '1 day' : `${d} days`}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" disabled={busy}>
          Create invite
        </Button>
      </form>

      {latest && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-4">
          <div>
            <p className="text-xs font-medium text-muted">New invite code</p>
            <p className="font-mono text-2xl font-bold tracking-widest">
              {formatInviteCode(latest)}
            </p>
          </div>
          <Button variant="secondary" onClick={() => copy(latest)}>
            <Copy className="size-4" aria-hidden />
            Copy
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-danger">Couldn't load invites. Check your connection.</p>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-muted">No invites yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {sorted.map((invite) => {
            const active =
              inviteProblem(
                {
                  expiresAtMs: invite.expiresAt.toMillis(),
                  uses: invite.uses,
                  maxUses: invite.maxUses,
                },
                now,
              ) === null;
            return (
              <li key={invite.code} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold tracking-wider">
                    {formatInviteCode(invite.code)}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {invite.note ? `${invite.note} · ` : ''}
                    {statusOf(invite, now)}
                  </p>
                </div>
                {active && (
                  <Button variant="ghost" className="h-8 px-3" onClick={() => copy(invite.code)}>
                    Copy
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="h-8 px-3 text-danger"
                  aria-label={`Revoke invite ${formatInviteCode(invite.code)}`}
                  onClick={() => setRevoking(invite)}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Revoke
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {revoking && (
        <ConfirmModal
          open
          onClose={() => setRevoking(null)}
          title="Revoke this invite?"
          description="The code stops working straight away. Friends who already joined keep access."
          confirmLabel="Revoke"
          onConfirm={() => revokeInvite(revoking.code)}
        />
      )}
    </section>
  );
}
