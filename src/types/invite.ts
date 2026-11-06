import type { Timestamp } from 'firebase/firestore';

/** `invites/{code}` (see docs/README.md → Data model). The document id is the code. */
export interface Invite {
  code: string;
  createdBy: string;
  createdAt: Timestamp | null;
  expiresAt: Timestamp;
  maxUses: number;
  uses: number;
  note: string;
}

/** `allowedUsers/{email}` (see docs/README.md → Data model). */
export interface Friend {
  email: string;
  addedAt: Timestamp | null;
  note: string | null;
  /** Set when the friend joined with an invite code. */
  inviteCode: string | null;
}
