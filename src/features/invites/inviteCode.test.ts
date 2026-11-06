import { describe, expect, it } from 'vitest';
import {
  formatInviteCode,
  generateInviteCode,
  INVITE_CODE_LENGTH,
  isWellFormedInviteCode,
  normalizeInviteCode,
} from './inviteCode';
import { inviteProblem, INVITE_EXPIRED, INVITE_MISSING, INVITE_USED_UP } from './inviteRules';

describe('invite codes', () => {
  it('generates well-formed codes that differ', () => {
    const a = generateInviteCode();
    const b = generateInviteCode();
    expect(a).toHaveLength(INVITE_CODE_LENGTH);
    expect(isWellFormedInviteCode(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it('normalises typed input', () => {
    expect(normalizeInviteCode(' abcd-efgh jklm ')).toBe('ABCDEFGHJKLM');
  });

  it('rejects codes with confusable characters or the wrong length', () => {
    expect(isWellFormedInviteCode('ABCDEFGHJKL0')).toBe(false); // 0 is not in the alphabet
    expect(isWellFormedInviteCode('ABCDEFGHJKL')).toBe(false);
  });

  it('formats codes in groups of four', () => {
    expect(formatInviteCode('ABCDEFGHJKLM')).toBe('ABCD-EFGH-JKLM');
  });
});

describe('inviteProblem', () => {
  const now = 1_000_000;
  const live = { expiresAtMs: now + 1000, uses: 0, maxUses: 1 };

  it('accepts a live invite with uses left', () => {
    expect(inviteProblem(live, now)).toBeNull();
  });

  it('reports a missing invite', () => {
    expect(inviteProblem(null, now)).toBe(INVITE_MISSING);
  });

  it('reports an expired invite', () => {
    expect(inviteProblem({ ...live, expiresAtMs: now }, now)).toBe(INVITE_EXPIRED);
  });

  it('reports an invite that has been used up', () => {
    expect(inviteProblem({ ...live, uses: 1 }, now)).toBe(INVITE_USED_UP);
  });
});
