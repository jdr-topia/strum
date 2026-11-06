# Handoff — Phase 0 — Project Setup

**Date:** 2026-11-06
**Phase doc:** docs/phase-0-setup.md
**Status:** Complete
**Last commit:** bb71d6e phase-0: scaffold Vite app shell with Firebase and Cloudinary config (this handoff is committed right after it)

## What was built
- Vite 8 + React 19 + TypeScript 6 scaffold in the repo root; `@/` → `src/` alias (`vite.config.ts`, `tsconfig.app.json`).
- Dependencies from the phase doc installed (runtime + dev), plus `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-config-prettier`, `prettier-plugin-tailwindcss`, `@testing-library/jest-dom`, `@testing-library/dom`, `globals`.
- Tailwind 4 dark theme with emerald accent: tokens in `@theme` in `src/index.css`.
- `src/config/env.ts` — `parseEnv()` (pure, tested) + `getEnv()` (cached, throws `EnvError`); typed `ImportMetaEnv` in `src/vite-env.d.ts`.
- `src/main.tsx` — validates env first; shows `src/components/ConfigErrorScreen.tsx` on missing/invalid vars, otherwise lazy-loads Firebase + `App`.
- `src/config/firebase.ts` — `app`, `auth` (`initializeAuth` + `browserLocalPersistence` + popup resolver), `db` (persistent multi-tab local cache).
- `src/config/cloudinary.ts` — `UPLOAD_URL()`, `streamUrl()` (128k MP3 or original), `coverUrl()`.
- `firebase.json` (hosting `dist` + SPA rewrite, rules/indexes, auth 9099 / firestore 8080 / UI 4000 emulators), `.firebaserc` (default `strum-5655d`), deny-all `firestore.rules`, empty `firestore.indexes.json`.
- App shell: `src/App.tsx` (BrowserRouter + Toaster), `src/AppRoutes.tsx`, `src/components/layout/` (`AppLayout`, `Sidebar`, `BottomTabBar`, `navItems`), `src/features/player/PlayerBar.tsx` + `MiniPlayer.tsx` placeholders.
- Placeholder pages for every route: `/login`, `/`, `/library`, `/upload`, `/search`, `/playlist/:id`, `/folder/:id`, `/now-playing`, plus a 404.
- Shared components in `src/components/`: `Button`, `IconButton`, `Modal`, `Menu`, `Toaster` + `toastStore` (`toast.info/success/error()`), `Cover` (image + stable gradient fallback via `src/lib/gradient.ts`), `Spinner`, `EmptyState`, `PageHeader`.
- Tooling: ESLint flat config (TS + react-hooks + react-refresh + prettier, bans `process.env` in `src/`), Prettier, Vitest (jsdom). Scripts: `dev`, `build`, `preview`, `lint`, `format`, `test`, `test:watch`, `emulators`.
- Tests (26): env parsing, Cloudinary URLs, toast store, gradient, every route renders, nav click works, config error screen.
- `.claude/launch.json` — dev-server config for the Claude desktop preview pane.

## Acceptance criteria
- [x] `npm run dev` opens the app shell with working navigation on desktop and mobile widths — checked in the browser at desktop width (sidebar + player bar) and 375px (tab bar + mini-player); navigation covered by `src/AppRoutes.test.tsx`.
- [x] Missing env var shows a clear error screen instead of a blank page — seen in the browser before `.env.local` existed; unit-tested.
- [x] `npm run build` and `npm run lint` pass with no errors — also `npm run test` (26 passing).
- [x] `npm run emulators` starts Auth + Firestore emulators — "All emulators ready" seen (Java 25 present).
- [ ] App actually talks to the real Firebase project — needs owner verification in Phase 1 (nothing in Phase 0 makes a Firestore/Auth call; the app loads with the real config and no console errors).

## Deviations from plan
- React 19 / Vite 8 / Tailwind 4 / TypeScript pinned to `~6.0` (typescript-eslint doesn't support TS 7, which the Vite template now ships with oxlint). Recorded in `docs/README.md` (stack table) and `docs/phase-0-setup.md` ("As built").
- `initializeAuth` instead of `getAuth`; Firebase and `App` are dynamically imported after env validation; Cloudinary helpers take an optional config for testing; routes split into `AppRoutes.tsx`; emulators run under the `demo-strum` project. All in `docs/phase-0-setup.md` "As built".
- No `tailwind.config.js` — Tailwind 4 is configured in CSS.
- `git init` was already done during planning.

## Deferred / known issues
- `vite-plugin-pwa` installed but not configured — Phase 5.
- The app doesn't yet connect to the emulators in dev (`connectAuthEmulator` / `connectFirestoreEmulator`). Phase 1 should add this if it wants to run against emulators locally (e.g. an optional `VITE_USE_EMULATORS` flag — update `.env.example`, `env.ts` and docs if so).
- `npm audit` reports advisories in dev dependencies (mostly from `firebase-tools`); not addressed.
- Git warns about LF→CRLF conversion (`core.autocrlf`); harmless. A `.gitattributes` could pin LF if wanted.

## Owner action needed
- **`.env.example` contains your real config values (uncommitted change).** During this session the real values were written into `.env.example` instead of `.env.local`. A copy of them is now in `.env.local` (git-ignored) and the app uses it. Restore the template with `git checkout -- .env.example` so it isn't committed by accident.
- Decisions table: defaults were used (Strum, dark only, emerald, 50 MB, 128 kbps, one level of nesting, many playlists per song, mixed devices, npm). Tell the next agent if any should change.
- Phase 1 needs: Google sign-in enabled in Firebase Auth, Firestore created, and the `allowedUsers/{email}` docs for you and your friends (see `docs/phase-1-auth.md`).

## How to run
- `npm install`
- `npm run dev` — app at http://localhost:5173 (needs `.env.local`; without it you get the config error screen)
- `npm run lint` · `npm run build` · `npm run test`
- `npm run emulators` — Auth + Firestore emulators (UI at http://localhost:4000), needs Java

## Next phase
- **Phase 1 — Authentication & Friends Allowlist**, `docs/phase-1-auth.md`.
- Use `auth` and `db` from `src/config/firebase.ts`; use `toast` from `src/components/toastStore.ts` for user-facing errors.
- `/login` is a placeholder (`src/features/auth/LoginPage.tsx`); add `RequireAuth` around the `AppLayout` route in `src/AppRoutes.tsx`.
- Rules tests need `@firebase/rules-unit-testing` (not installed yet) against the emulator; the `demo-strum` project id works offline.

## Continuation prompt
```text
You are continuing the Strum project in this repository.

1. Read AGENTS.md and follow it.
2. Read docs/README.md.
3. Read the latest handoff: docs/handoffs/01-phase-0-setup.md
4. Implement Phase 1 — Authentication & Friends Allowlist as described in docs/phase-1-auth.md.

Before coding, confirm the repo state matches the handoff and list any owner actions from the handoff that are still pending. When the phase is complete, follow the "Definition of done" in AGENTS.md: write the next handoff file, commit, and give me the next continuation prompt.
```
