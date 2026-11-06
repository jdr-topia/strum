import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { allowlistId } from '@/features/auth/authHelpers';
import { ValidationError } from '@/lib/errors';
import type { Friend, Invite } from '@/types/invite';
import { generateInviteCode, isWellFormedInviteCode, normalizeInviteCode } from './inviteCode';
import { inviteProblem, INVITE_MISSING } from './inviteRules';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_NOTE = 100;

const invitesRef = () => collection(db, 'invites');
const inviteRef = (code: string) => doc(db, 'invites', code);
const friendsRef = () => collection(db, 'allowedUsers');
const friendRef = (email: string) => doc(db, 'allowedUsers', allowlistId(email));

export interface NewInviteOptions {
  note: string;
  maxUses: number;
  days: number;
}

/** True for `admins/{email}`. Admins are added once by hand in the console. */
export async function isEmailAdmin(email: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'admins', allowlistId(email)));
  return snap.exists();
}

function toInvite(code: string, data: DocumentData): Invite {
  return {
    code,
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? null,
    expiresAt: data.expiresAt,
    maxUses: typeof data.maxUses === 'number' ? data.maxUses : 1,
    uses: typeof data.uses === 'number' ? data.uses : 0,
    note: data.note ?? '',
  };
}

/** Creates an invite and returns its code. Admin only (enforced by rules). */
export async function createInvite(
  adminEmail: string,
  options: NewInviteOptions,
  nowMs: number = Date.now(),
): Promise<string> {
  if (!Number.isInteger(options.maxUses) || options.maxUses < 1 || options.maxUses > 50) {
    throw new ValidationError('An invite can be used between 1 and 50 times.');
  }
  if (!(options.days > 0) || options.days > 90) {
    throw new ValidationError('An invite can last between 1 and 90 days.');
  }
  const code = generateInviteCode();
  await setDoc(inviteRef(code), {
    createdBy: adminEmail.toLowerCase(),
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(nowMs + options.days * DAY_MS),
    maxUses: options.maxUses,
    uses: 0,
    note: options.note.trim().slice(0, MAX_NOTE),
  });
  return code;
}

/** Live list of invites. Admin only; the list is not sorted here. */
export function subscribeInvites(
  onNext: (invites: Invite[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    invitesRef(),
    (snap: QuerySnapshot<DocumentData>) => onNext(snap.docs.map((d) => toInvite(d.id, d.data()))),
    (err) => onError(err),
  );
}

/** Deletes an invite so it can no longer be redeemed. Friends who already joined keep access. */
export async function revokeInvite(code: string): Promise<void> {
  await deleteDoc(inviteRef(code));
}

/**
 * Redeems an invite for `email`: adds the allowlist entry and counts one use, in one batch.
 * Rules check the code again on the server, so the local check is only for a clear message.
 */
export async function redeemInvite(email: string, typed: string, nowMs: number = Date.now()) {
  const code = normalizeInviteCode(typed);
  if (!isWellFormedInviteCode(code)) throw new ValidationError(INVITE_MISSING);

  const snap = await getDoc(inviteRef(code));
  const invite = snap.exists() ? toInvite(code, snap.data()) : null;
  const problem = inviteProblem(
    invite && {
      expiresAtMs: invite.expiresAt.toMillis(),
      uses: invite.uses,
      maxUses: invite.maxUses,
    },
    nowMs,
  );
  if (problem) throw new ValidationError(problem);

  const batch = writeBatch(db);
  batch.set(friendRef(email), {
    addedAt: serverTimestamp(),
    note: null,
    inviteCode: code,
  });
  batch.update(inviteRef(code), { uses: increment(1) });
  await batch.commit();
}

/** Live list of friends. Admin only. */
export function subscribeFriends(
  onNext: (friends: Friend[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    friendsRef(),
    (snap: QuerySnapshot<DocumentData>) =>
      onNext(
        snap.docs.map((d) => ({
          email: d.id,
          addedAt: d.data().addedAt ?? null,
          note: d.data().note ?? null,
          inviteCode: d.data().inviteCode ?? null,
        })),
      ),
    (err) => onError(err),
  );
}

/** Removes a friend's access. Their songs stay in the database. Admin only. */
export async function removeFriend(email: string): Promise<void> {
  await deleteDoc(friendRef(email));
}
