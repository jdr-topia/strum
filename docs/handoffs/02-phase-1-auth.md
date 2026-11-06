# Handoff — Phase 1 — Authentication & Friends Allowlist

**Date:** 2026-11-06
**Phase doc:** docs/phase-1-auth.md
**Status:** Complete with deferrals
**Last commit:** a0678d5 phase-1: add Google sign-in, friends allowlist and Firestore rules (this handoff is committed right after it)

## What was built
- `src/features/auth/AuthProvider.tsx` — subscribes to `onAuthStateChanged`, finishes redirect sign-ins (`getRedirectResult`), runs the allowlist check, exposes context.
- `src/features/auth/AuthContext.ts` + `useAuth.ts` — `{ status: 'loading' | 'signedOut' | 'notAllowed' | 'error' | 'ready', user, signIn, signOut, retry }`.
- `src/features/auth/authApi.ts` — Firestore access: `isEmailAllowed(email)` (`allowedUsers/<lowercase email>`), `ensureUserProfile(user)` (creates `users/{uid}` once with `createdAt`; syncs name/photo later).
- `src/features/auth/checkAccess.ts` — pure decision logic (unverified/missing email → not allowed; not on list → not allowed; else ensure profile → ready; Firestore failure → throws → `error`).
- `src/features/auth/signIn.ts` + `authHelpers.ts` — popup sign-in, redirect for installed iOS PWAs or blocked popups, friendly error messages, cancel detection.
- `src/features/auth/RequireAuth.tsx` — guards all app routes incl. `/now-playing`: loader / redirect to `/login` (remembers `from`) / `NotInvitedPage` / `AccessErrorPage` / outlet.
- `LoginPage.tsx` (Continue with Google), `NotInvitedPage.tsx`, `AccessErrorPage.tsx`, `ProfileMenu.tsx`, `UserAvatar.tsx`.
- Profile menu in the desktop sidebar footer and in a new mobile top bar (`src/components/layout/AppLayout.tsx`). `Menu` got `header` and `up` props.
- `src/components/FullScreenLoader.tsx`, `src/types/user.ts` (`AuthUser`, `UserProfile`), `src/test/fakeAuth.tsx` (fake auth context for component tests).
- `firestore.rules` — the rules from the phase doc (allowlist + per-user data + song/playlist/folder validation).
- `docs/README.md` → new "Adding friends" section (console steps, publishing rules).
- Removed `firebase-tools` dev dependency, `npm run emulators`, and the `emulators` block in `firebase.json` (owner decision).
- Tests: 43 passing (route guard for every status, login, not-invited sign-out, retry, profile menu, sign-in method selection, error mapping, `checkAccess`).

## Acceptance criteria
- [ ] You can sign in with Google; your `users/{uid}` doc is created — needs owner verification: `npm run dev`, click **Continue with Google**, then check Firestore → `users` for your uid doc. (Verified here only that the app loads against the real project, redirects to `/login`, and has no console errors.)
- [ ] A Google account not in `allowedUsers` sees the "not invited" screen and can't read/write anything — UI covered by tests; needs owner verification: sign in with an account that isn't on the list → "You're not on the list". Rules: see manual checks below.
- [ ] Sign-out works; reloading keeps you signed in — needs owner verification (persistence is `browserLocalPersistence`; sign-out is tested against the fake context).
- [ ] Sign-in works on Android Chrome, desktop Chrome/Edge, and iOS Safari — needs owner verification on devices (requires a deployed/HTTPS URL or LAN access for phones; see known issues).
- [ ] Rules tests pass — **replaced by manual checks** (no emulator by owner decision). In Firebase console → Firestore → Rules → **Rules Playground**, after publishing:
  1. Unauthenticated `get` on `/users/anyuid` → denied.
  2. Authenticated (provider google.com, email = an address *not* in `allowedUsers`, email_verified true) `get` on `/users/<that uid>` → denied.
  3. Authenticated as an allowlisted email, uid A: `get /users/A/songs/x` → allowed; `get /users/B/songs/x` → denied.
  4. As allowlisted user A, `create /users/A/songs/x` with `title: ""` or `audioUrl: "https://evil.com/a.mp3"` → denied; with a valid song doc → allowed.

## Deviations from plan
- No Firebase CLI, emulators, Admin SDK, rules-unit-testing or `npm run allow` script — owner said to use only the Firebase client API. Rules are published from the console; friends are added in the console. Recorded in `docs/phase-1-auth.md` ("As built"), `docs/phase-0-setup.md`, `docs/README.md` and **`AGENTS.md`** (hard rule + testing convention updated to match).
- Extra auth status `error` + `retry()` so an offline/failed allowlist check doesn't show "not invited". In `docs/phase-1-auth.md`.
- Mobile top bar added to hold the profile avatar. In `docs/phase-1-auth.md`.

## Deferred / known issues
- **Phase 5 deploy plan uses `npx firebase deploy`/`firebase login`** (`docs/phase-5-pwa-deploy.md`, `docs/00-what-you-need-to-provide.md`). That conflicts with the no-CLI decision — Phase 5 must ask the owner how to deploy hosting (e.g. one-off `npx firebase-tools` run by the owner, or another static host). Rules/indexes go through the console.
- **Redirect sign-in and third-party storage:** on browsers that block third-party storage (Safari, some Chrome modes) `signInWithRedirect` only works if `VITE_FIREBASE_AUTH_DOMAIN` is the same domain the app is served from. With Firebase Hosting, set it to `<project>.web.app` (or the custom domain) at deploy time — Phase 5. Popup sign-in (the default) isn't affected.
- No local emulator, so dev runs against the real Firebase project.
- Working tree has **`.env.example` deleted** (unstaged) — the handoff from Phase 0 said "modified". Left untouched and not committed. Owner: restore the template with `git checkout -- .env.example` when convenient, or tell the next agent what you want.
- `npm audit` advisories: fewer now that `firebase-tools` is gone; not reviewed.

## Owner action needed
- Firebase console → **Authentication → Sign-in method → Google → Enable** (if not yet done).
- Firebase console → **Authentication → Settings → Authorized domains**: `localhost` is there by default; add your LAN IP/host if you test on a phone against the dev server, and the hosting domain later.
- **Create Firestore** (if not yet) and **publish `firestore.rules`** (Firestore → Rules → paste → Publish). Until then the database runs with whatever rules it was created with.
- Add `allowedUsers/<your-email-lowercase>` (and friends) — see `docs/README.md` → "Adding friends".
- Run the manual checks in "Acceptance criteria" above.

## How to run
- `npm install`
- `npm run dev` — http://localhost:5173 (needs `.env.local`)
- `npm run lint` · `npm run build` · `npm run test`

## Next phase
- **Phase 2 — Upload & Song Library**, `docs/phase-2-upload.md`.
- Get the current user with `useAuth().user` (`uid`); API modules should take `uid` as an argument. Only `status === 'ready'` users reach app routes.
- All song writes must satisfy `validSong` in `firestore.rules` (title 1–200 chars, artist string ≤200, `cloudinaryPublicId` string, `audioUrl` starting `https://res.cloudinary.com/`, `durationSec` number, `deleted` bool). Any rules change → update `docs/README.md` and list a manual Rules Playground check in the handoff (no emulator).
- For component tests, wrap in `FakeAuthProvider` from `src/test/fakeAuth.tsx`. Don't import `@/config/firebase` from components you want to unit-test (it initialises Firebase on import); keep Firestore calls in `*Api.ts` modules.

## Continuation prompt
```text
You are continuing the Strum project in this repository.

1. Read AGENTS.md and follow it.
2. Read docs/README.md.
3. Read the latest handoff: docs/handoffs/02-phase-1-auth.md
4. Implement Phase 2 — Upload & Song Library as described in docs/phase-2-upload.md.

Before coding, confirm the repo state matches the handoff and list any owner actions from the handoff that are still pending. When the phase is complete, follow the "Definition of done" in AGENTS.md: write the next handoff file, commit, and give me the next continuation prompt.
```
