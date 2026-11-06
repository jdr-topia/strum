# Handoff — Planning

**Date:** 2026-11-06
**Phase doc:** docs/README.md (overall plan)
**Status:** Complete
**Last commit:** the initial commit — `docs: add project plan, agent instructions and env template`

## What was built
- `docs/README.md` — architecture, stack, Firestore data model (all data under `users/{uid}`), serverless constraints, target folder structure.
- `docs/00-what-you-need-to-provide.md` — owner checklist (Firebase config, Cloudinary preset, allowlist emails, decisions).
- `docs/phase-0-setup.md` … `docs/phase-5-pwa-deploy.md` — detailed per-phase plans with acceptance criteria.
- `AGENTS.md` — agent rules, conventions, definition of done, handoff template, continuation prompt template. `CLAUDE.md` imports it.
- `.env.example` — every env var the app needs; `.gitignore` excludes `.env.local`.
- No application code yet.

## Acceptance criteria
- [x] Plan covers auth, upload, player, playlists/folders, PWA/deploy.
- [x] Social features removed from scope (owner request).

## Deviations from plan
- None. Note: phases are numbered from **0** (setup). "Phase 1" in the docs is Auth.

## Deferred / known issues
- None.

## Owner action needed
Before Phase 0 can be finished end-to-end:
- [ ] Install Node.js 20+.
- [ ] Create the Firebase project, enable Google sign-in, create Firestore (production mode), register a web app — steps in `docs/00-what-you-need-to-provide.md` §2.
- [ ] Create the Cloudinary account and unsigned upload preset — §3.
- [ ] `cp .env.example .env.local` and fill in the values.
- [ ] Answer the decisions table in §"Decisions" (or accept defaults: name Strum, dark only, emerald accent, 50 MB, 128 kbps, one level of folder nesting, npm).

The Phase 0 scaffold can be built without the configs; only the "app connects to Firebase" check needs them.

## How to run
- Nothing to run yet.

## Next phase
- **Phase 0 — Project Setup**, `docs/phase-0-setup.md`.
- `.env.example` and `.gitignore` already exist — extend, don't overwrite. Scaffold Vite into the existing repo root (it is not empty).

## Continuation prompt
```text
You are continuing the Strum project in this repository.

1. Read AGENTS.md and follow it.
2. Read docs/README.md.
3. Read the latest handoff: docs/handoffs/00-planning.md
4. Implement Phase 0 — Project Setup as described in docs/phase-0-setup.md.

Before coding, confirm the repo state matches the handoff and list any owner actions from the handoff that are still pending. When the phase is complete, follow the "Definition of done" in AGENTS.md: write the next handoff file, commit, and give me the next continuation prompt.
```
