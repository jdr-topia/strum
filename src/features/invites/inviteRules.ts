/** What is wrong with an invite right now, or null if it can be redeemed. */
export interface InviteState {
  expiresAtMs: number;
  uses: number;
  maxUses: number;
}

export const INVITE_MISSING = "That invite code doesn't exist. Check it and try again.";
export const INVITE_EXPIRED = 'That invite has expired. Ask for a new one.';
export const INVITE_USED_UP = 'That invite has already been used. Ask for a new one.';

export function inviteProblem(invite: InviteState | null, nowMs: number): string | null {
  if (!invite) return INVITE_MISSING;
  if (invite.expiresAtMs <= nowMs) return INVITE_EXPIRED;
  if (invite.uses >= invite.maxUses) return INVITE_USED_UP;
  return null;
}
