# Handoff — Phase 2 — Upload & Song Library

**Date:** 2026-11-06
**Phase doc:** docs/phase-2-upload.md
**Status:** Complete with deferrals
**Last commit:** see `git log -1` (commit "phase-2: add handoff")

## What was built
- `src/features/upload/validateFile.ts` — audio type/size check (MIME or extension; limit from `VITE_MAX_UPLOAD_MB`).
- `src/features/upload/extractMetadata.ts` — tags via `music-metadata` (lazy import), embedded cover → Blob, duration fallback via `<audio>`, filename/"Unknown Artist" defaults. Never throws.
- `src/features/upload/cloudinaryUpload.ts` — XHR upload with progress + abort, friendly error mapping, `deleteByToken()` (no API secret).
- `src/features/upload/uploadSong.ts` — pipeline: cover → audio → Firestore doc; on any failure, uploaded assets are removed with their delete tokens.
- `src/features/upload/uploadStore.ts` — Zustand queue: concurrency 2, retry, cancel pending/active, clear finished, "apply artist/album to pending", toast summary.
- `src/features/upload/duplicates.ts` — title + artist (normalised) + duration ±2 s hint.
- `src/features/upload/UploadPage.tsx`, `UploadReviewRow.tsx`, `UploadBadge.tsx` — drop zone, review rows (editable), overall progress, `beforeunload` guard while uploading, upload count badge on the Upload nav item (sidebar and mobile tab bar).
- `src/features/library/songApi.ts` — the only Firestore access for songs: live subscribe, `addSong`, `updateSongInfo` (recomputes `searchKeywords`), `softDeleteSongs` (also removes the ids from all playlists, batched), `restoreSongs`, `hardDeleteSongs`.
- `src/features/library/useSongs.ts`, `sortSongs.ts` (sort + filter, pure), `LibraryPage.tsx`, `SongRow.tsx`, `EditSongModal.tsx` (title/artist/album, replace cover), multi-select + bulk delete, undo toast (5 s).
- `src/features/settings/` — `SettingsPage` at `/settings` (linked from the profile menu) with the **Deleted files** section: restore, copy Cloudinary IDs, "I've removed them from Cloudinary" → hard-delete docs.
- `src/lib/keywords.ts` (search tokens: words + prefixes ≥ 2 chars, cap 50), `src/lib/formatters.ts`, `src/types/song.ts`.
- `src/components/toastStore.ts` + `Toaster.tsx` — toasts can carry an action button (`toast.withAction`).
- `firestore.indexes.json` — composite index `songs (deleted ASC, createdAt DESC)`.
- Tests added: keywords, formatters, validateFile, extractMetadata (pure mapping), cloudinaryUpload (encoding + error mapping), duplicates, sortSongs/filter, uploadStore (concurrency, error/retry, cancel, apply-to-pending), LibraryPage (filter, soft-delete via menu). Total: **84 passing**.

## Acceptance criteria
- [ ] Upload 10 MP3s at once; progress shown; all appear with tags and covers — needs owner verification with real files and Cloudinary.
- [x] Files with no tags get sensible defaults and can be edited before upload — covered by `metadataFromParsed` tests and the review-row inputs (UI not browser-tested).
- [x] Too-large or wrong-type files are rejected before upload with a clear message — `validateFile.test.ts`.
- [x] If the Firestore save fails, the Cloudinary asset is removed via delete token — implemented in `uploadSong.ts` (`removeOrphans` on `addSong` failure). Needs owner check with the preset's "Return delete token" enabled.
- [x] Edit and delete (with undo) work; deleted songs vanish from playlists — unit/component tested for delete; playlist removal is in `softDeleteSongs` (playlists are empty until Phase 4, so only the code path is verified).
- [ ] Library of 1,000 songs scrolls smoothly on a mid-range phone — needs owner verification; not virtualised (see deferred).

## Deviations from plan
- **Settings route added** (`/settings`) — phase doc mentioned a Settings page but no route existed; it is linked from the profile menu.
- **Row actions Play / Play next / Add to queue / Add to playlist are not in the library menu** — they need the player (Phase 3) and playlists (Phase 4). Library row menu has Edit info and Delete only.
- **Virtualisation not added** (`@tanstack/react-virtual` not installed). The doc says only if > 500 songs; add it when the owner's library needs it.
- **Metadata unit tests use mocked parse results**, not real fixture mp3/m4a files (none in repo). Owner to test with real files.
- **Undo restores the song but not its playlist memberships** (a restored song must be re-added by hand).
- **Replacing a cover does not delete the old Cloudinary cover** (no signed deletes from client). It stays in Cloudinary until cleaned up in the console.
- **Duplicate check** shows a hint and the row can be removed to skip it; it does not block upload.
- No Firestore rules change in this phase.

## Deferred / known issues
- Play / Play next / Add to queue menu items — Phase 3 (player). Add to playlist — Phase 4.
- Virtualised list for very large libraries — later (only if needed).
- Old covers left in Cloudinary after cover replacement — owner cleans up in console (Settings → Deleted files only covers deleted songs).
- `npm audit` not reviewed.

## Owner action needed
- **Create the composite index** `songs` on `deleted` ASC + `createdAt` DESC: Firestore console → Indexes → Composite → Add (or open the link Firestore prints in the browser console the first time the library loads). Without it the library query fails. `firestore.indexes.json` documents it.
- Confirm the Cloudinary upload preset has **Return delete token** on (phase 0 instructions) — needed for the orphan cleanup.
- Restore `.env.example` (still deleted in the working tree, carried over from phase 1). Not staged by this phase.
- Run the acceptance checks marked "needs owner verification" above on a deployed/dev build.

## How to run
- `npm install`
- `npm run dev` — http://localhost:5173 (needs `.env.local`)
- `npm run lint` · `npm run build` · `npm run test` (84 tests)

## Next phase
- **Phase 3 — Player**, `docs/phase-3-player.md`.
- Library row menu needs Play / Play next / Add to queue wired to the player store (`src/features/player/`). `useSongs()` and `Song` (`src/types/song.ts`) are ready for it.
- Song audio URL: `streamUrl(publicId)` in `src/config/cloudinary.ts` (or `song.audioUrl` as stored).

## Continuation prompt
```text
You are continuing the Strum project in this repository.

1. Read AGENTS.md and follow it.
2. Read docs/README.md.
3. Read the latest handoff: docs/handoffs/03-phase-2-upload.md
4. Implement Phase 3 — Player as described in docs/phase-3-player.md.

Before coding, confirm the repo state matches the handoff and list any owner actions from the handoff that are still pending. When the phase is complete, follow the "Definition of done" in AGENTS.md: write the next handoff file, commit, and give me the next continuation prompt.
```
