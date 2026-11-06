# Handoff — Invite codes (after Phase 4)

**Date:** 2026-11-06
**Phase doc:** none (feature added after phase 4; the design is in `docs/README.md` → "Adding friends")
**Status:** Complete with deferrals
**Last commit:** see `git log -1` (commit "phase-4: add invite codes")

## What was built
- **Rules** (`firestore.rules`, changed):
  - `admins/{email}`: a document added once by hand. Only it makes someone an admin.
  - `invites/{code}`: admins create, list and delete. Any verified signed-in user can read one invite by its exact code. An update may only raise `uses` by one, and only while the invite is live.
  - `allowedUsers/{email}`: admins list, delete and create. A verified user may create their own entry only if it names a live invite (not expired, uses left). Updates are not allowed.
- **Client**
  - `src/features/invites/inviteCode.ts`: generates 12-character codes from a 32-character alphabet with no 0, O, 1 or I. Also normalises typed input and formats `ABCD-EFGH-JKLM`.
  - `src/features/invites/inviteRules.ts`: the "missing / expired / used up" messages, shared by the redeem check and the admin list.
  - `src/features/invites/inviteApi.ts`: `isEmailAdmin`, `createInvite`, `subscribeInvites`, `revokeInvite`, `redeemInvite` (adds the allowlist entry and counts one use in one batch), `subscribeFriends`, `removeFriend`.
  - `RedeemInviteForm.tsx` on the "not on the list" screen (`NotInvitedPage.tsx`). After joining, it calls `retry()`, which re-runs the access check.
  - `InvitesSection.tsx` and `FriendsSection.tsx` in Settings. Shown only to admins (`useIsAdmin.ts`). Create (note, uses 1/5/10, validity 1/7/30 days), copy, see status, revoke, list friends, remove friend. Admins can't remove themselves.
  - Types: `src/types/invite.ts` (`Invite`, `Friend`).
- **Docs**: `docs/README.md` data model (`admins`, `invites`, `allowedUsers.inviteCode`) and the rewritten "Adding friends" section.
- **Tests**: 149 passing. New: `inviteCode.test.ts` (code format, normalising, `inviteProblem`). `AppRoutes.test.tsx` mocks `inviteApi`.
- Not unit-tested: the rules and the redeem batch. The owner checks them below.

## Acceptance criteria
- [x] Invite codes are random, well-formed and normalised — `inviteCode.test.ts`.
- [x] Missing, expired and used-up invites give clear messages — `inviteCode.test.ts`, via `inviteProblem`.
- [x] Lint, build and tests pass — `npm run lint`, `npm run build`, `npm run test` (149 tests).
- [ ] Admin can create an invite and see it in the list — needs owner verification (see below).
- [ ] A new Google account can join with a valid code, and only once for a single-use invite — needs owner verification.
- [ ] Rules refuse the things they should — needs owner verification (see below).

## Deviations from plan
- **Invites are bearer codes.** Anyone who has an unexpired code can join until its uses run out. Mitigations: random 60-bit codes, default 1 day to 30 days, uses capped at 1–10 in the UI (50 in the rules).
- **Uses can't be checked atomically.** Rules can't count uses in the same transaction as the allowlist write. Two people redeeming the last use at the same moment could both get in. Codes are random, so this is low risk for a friends' app.
- **Any verified signed-in user can raise `uses` by one** on a live invite, because the rules can't tie the increment to a matching allowlist entry. Someone who has a code could use up its uses without joining. This is denial of that invite only, not access.
- **Adding a friend by email inside the app** is not built. The rules let admins create `allowedUsers`, but the UI only adds people through invites. Use the console for a direct add.
- **Revoking an invite** deletes it. Friends who joined with it keep access (their `allowedUsers` entry stays).

## Deferred / known issues
- Removing a friend takes effect at their next access check. Their open session keeps working until it reloads or their token expires.
- Admin status is checked once per page load (`useIsAdmin`). A new admin must reload the app to see the Invites section.
- Invite list shows all invites, including past ones, with no clean-up button. Revoke removes one at a time.
- The `allowedUsers` note from an invite is empty; the friend's `inviteCode` is kept instead.

## Owner action needed (in this order)
1. **Publish the rules.** Firebase console → Firestore Database → Rules → paste `firestore.rules` → **Publish**. Check the file first; the Firestore rules editor shows any syntax error.
2. **Make yourself an admin.** Firestore → collection `admins` (create it the first time) → Add document. Document ID = your Google email, all lowercase. Field `addedAt` (timestamp, now). Then reload Strum. You should see **Invites** and **Friends** at the top of Settings. Until then, these sections stay hidden.
3. **Check the rules** (use a second Google account that is *not* on the friends list, plus your own):
   - As the other account, on the "not on the list" screen, enter a code that doesn't exist → "That invite code doesn't exist…".
   - As admin, create an invite with 1 use, 1 day. Copy it.
   - As the other account, enter the code → you're in, and the app opens. Sign out and back in: still in.
   - As the other account, try to enter the same code from a third account → "That invite has already been used…".
   - As admin, create an invite and revoke it. The other account's code → "doesn't exist".
   - As admin, remove the other account from Friends. They get "not on the list" on their next load.
   - Optional: in the Firebase console's **Rules Playground**, check that a non-admin cannot `list` `invites` or `allowedUsers`.
4. Keep `.env.example` as in handoff 05 (still deleted in the working tree, not part of these commits).

## How to run
- `npm run dev` (needs `.env.local`), then sign in as an admin to see Settings → Invites.
- `npm run lint` · `npm run build` · `npm run test` (149 tests)

## Next phase
- Still **Phase 5 — PWA, Polish & Deploy**, `docs/phase-5-pwa-deploy.md`. The Phase 4 owner checks (handoff 05) are still open.

## Continuation prompt
```text
You are continuing the Strum project in this repository.

1. Read AGENTS.md and follow it.
2. Read docs/README.md.
3. Read the latest handoff: docs/handoffs/06-invite-codes.md
4. Implement Phase 5 — PWA, Polish & Deploy as described in docs/phase-5-pwa-deploy.md.

Before coding, confirm the repo state matches the handoff and list any owner actions from the handoff that are still pending. When the phase is complete, follow the "Definition of done" in AGENTS.md: write the next handoff file, commit, and give me the next continuation prompt.
```
