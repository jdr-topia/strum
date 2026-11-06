# AGENTS.md — Instructions for AI coding agents

Read this file fully before doing anything in this repository.

## Project

**Strum** is a private music player for a small group of friends. Users sign in with Google, upload their own songs, organise them into playlists and folders, and play them in the browser (installable PWA).

- **No backend server.** The client talks directly to Firebase (Auth, Firestore, Hosting) and Cloudinary (audio + cover storage/streaming).
- **Private by default.** Every user's library lives under `users/{uid}/...`. The only sharing is **public songs**: an owner can share a song, which is mirrored to top-level `publicSongs/{songId}` and shown to all allowed users in **Discover** (see `docs/README.md` → Data model). No other social features (public playlists, likes, comments, activity).
- Stack: Vite + React + TypeScript, Tailwind, React Router, Zustand, `music-metadata`, `@dnd-kit`, `vite-plugin-pwa`, Vitest.

## Where things are

| Path | What |
|---|---|
| `docs/README.md` | Architecture, data model, constraints, target folder structure — **source of truth** |
| `docs/00-what-you-need-to-provide.md` | What the project owner supplies (configs, decisions) |
| `docs/phase-N-*.md` | Detailed plan + acceptance criteria for each phase |
| `docs/handoffs/` | One handoff file per completed phase — **read the latest one first** |
| `.env.example` | Required env vars; real values live in `.env.local` (git-ignored) |

## Starting a session

1. Read this file.
2. Read `docs/README.md`.
3. Read the **latest** file in `docs/handoffs/` (highest number). It says what is done, what is pending, and any deviations from the plan.
4. Read the phase doc you are asked to work on.
5. Check `git log --oneline -20` and `git status` to confirm the repo matches the handoff.
6. If the handoff lists open questions or blockers that affect your phase, ask the owner before coding.

## Hard rules

- **Never** put secrets in code or commits: no Cloudinary API secret, no Firebase service-account JSON, no passwords. Firebase web config and Cloudinary cloud name / unsigned preset name are public by design and come from `VITE_*` env vars.
- **Never** commit `.env.local` or any `.env` file other than `.env.example`.
- **Never** add a backend server. The only server-side code allowed is an *optional, explicitly requested* Firebase Cloud Function (see phase 5 "after launch").
- **Never** read `process.env` in client code; use `import.meta.env` via `src/config/env.ts`.
- Keep user data under `users/{uid}/…` (the one exception is `publicSongs`, which must stay in step with the owner's private song — write both in one batch). Any data-model change must be reflected in `docs/README.md` **and** `firestore.rules` in the same commit.
- Every Firestore write path must be allowed by `firestore.rules`; every rules change must list a manual check for the owner in the handoff (there are no automated rules tests — see below).
- **No Firebase CLI, emulators or Admin SDK** (owner decision, Phase 1). The client SDK talks to Firebase directly; the owner publishes rules and manages `allowedUsers` in the Firebase console. Don't install `firebase-tools`, `firebase-admin` or `@firebase/rules-unit-testing`.
- Don't skip git hooks or force-push.
- Stay within the phase you were asked to do. If you notice something for a later phase, note it in the handoff instead of building it.

## Coding conventions

- TypeScript `strict`. No `any` unless commented why.
- Feature folders under `src/features/<feature>/` (components, hooks, api, store, tests together). Shared UI in `src/components/`, helpers in `src/lib/`, types in `src/types/`.
- Path alias `@/` → `src/`.
- Components: function components, named exports, one component per file, PascalCase filenames. Hooks: `useX.ts`.
- Firestore access goes through small API modules (`playlistApi.ts`, etc.), never inline in components.
- The `<audio>` element lives in `src/features/player/audioEngine.ts`, outside React. Don't create other `Audio` instances for playback.
- Tailwind for styling; no CSS-in-JS. Mobile-first; test at 375px width.
- User-facing errors go through the toast system with friendly messages.
- Tests: Vitest for logic (stores, helpers, tree building, search ranking) and components (with the fake auth context in `src/test/fakeAuth.tsx`). Firestore rules are verified manually by the owner.

## Definition of done for a phase

A phase is complete only when **all** of these are true:

1. Every task in `docs/phase-N-*.md` is done, or explicitly deferred with a reason in the handoff.
2. Every acceptance criterion is checked. Ones that need the owner's device/manual check are listed as "needs owner verification".
3. `npm run lint`, `npm run build` and `npm run test` pass. (Phase 0 onward; before Phase 0 there is no code.)
4. Any deviation from the plan is written back into the relevant `docs/` file.
5. A handoff file is written (see below).
6. Work is committed (see Commits).
7. The continuation prompt is given to the owner (see below).

## Handoff file (write at the end of every phase)

Path: `docs/handoffs/NN-<phase-slug>.md`, where `NN` is two digits in order (`00-planning.md`, `01-phase-0-setup.md`, `02-phase-1-auth.md`, …).

Use exactly this template:

```markdown
# Handoff — <Phase name>

**Date:** YYYY-MM-DD
**Phase doc:** docs/phase-N-*.md
**Status:** Complete | Complete with deferrals | Partial
**Last commit:** <short hash> <subject>

## What was built
- Bullet list of features/files, with paths.

## Acceptance criteria
- [x] criterion — how it was verified
- [ ] criterion — needs owner verification: <what to do>

## Deviations from plan
- What changed vs the phase doc and why (and which doc was updated). "None" if none.

## Deferred / known issues
- Item — why — which phase should pick it up.

## Owner action needed
- Anything the owner must do before the next phase (configs, console steps, testing on a device).

## How to run
- Commands needed to run/test what exists now.

## Next phase
- Name + doc path, plus anything the next agent must know first.

## Continuation prompt
<the exact prompt from the section below, filled in>
```

## Continuation prompt (give to the owner at the end of every phase)

Put it in the handoff file **and** print it in your final message inside a single fenced code block so the owner can copy it into a new session:

```text
You are continuing the Strum project in this repository.

1. Read AGENTS.md and follow it.
2. Read docs/README.md.
3. Read the latest handoff: docs/handoffs/<NN-file>.md
4. Implement <Phase N — name> as described in docs/<phase-file>.md.

Before coding, confirm the repo state matches the handoff and list any owner actions from the handoff that are still pending. When the phase is complete, follow the "Definition of done" in AGENTS.md: write the next handoff file, commit, and give me the next continuation prompt.
```

## Commits

- Commit at logical checkpoints within a phase and once at the end.
- Message format: `phase-N: <imperative summary>` (e.g. `phase-2: add upload queue with progress`). Docs-only: `docs: <summary>`.
- The final commit of a phase includes the handoff file.
- Don't push unless the owner asks.
