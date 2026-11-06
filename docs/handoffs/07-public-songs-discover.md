# Handoff — Public songs & Discover (after Phase 4)

**Date:** 2026-11-06
**Phase doc:** none (feature added after phase 4; the design is in `docs/README.md` → Data model → "Public songs (Discover)")
**Status:** Complete with deferrals
**Last commit:** ec4c49e phase-4: add public songs and Discover tab (this handoff is committed right after it)

## What was built
Owner decisions (confirmed before coding): top-level `publicSongs` mirror (not a collection-group query), show the uploader's display name, and others may add public songs to their own playlists.

- **Data model** (`docs/README.md`): `users/{uid}/songs/{id}.isPublic` (missing = false) and the new `publicSongs/{songId}` (same id, `ownerUid`, `ownerName`, song fields, `sharedAt`). `AGENTS.md` "No social features" rule replaced with "Private by default; public songs are the only sharing".
- **Rules** (`firestore.rules`): `publicSongs` readable by any friend. Create/update only by the owner (`ownerUid == auth.uid`, can't take over someone else's doc), only with valid fields, and only if the owner's private song with the same id is `isPublic == true` and `deleted == false` **after the batch** (`getAfter`). Delete by the owner, or of a doc that doesn't exist. `validSong` accepts an optional `isPublic` bool.
- **Writes** (`src/features/library/songApi.ts`):
  - `setSongsPublic(owner, songs, isPublic)` — private flag + public copy in one batch (batches of 200 songs).
  - `updateSongInfo(owner, song, patch)` — now takes the song; updates the public copy too, and can share/unshare (`patch.isPublic`).
  - `softDeleteSongs` also unshares (`isPublic: false`, copy deleted). `hardDeleteSongs` deletes any leftover copy. `addSong` writes `isPublic: false`.
- **Discover** (`src/features/discover/`):
  - `publicSongs.ts` — pure helpers: `ownerNameFor`, `publicSongFields`, `toPublicSong`, `isOwnSong`, `mergePlayable`, `unavailableIds`, `discoverSongs` (filter Everyone/Friends/Mine, text search incl. the sharer's name, sort Recently shared/Title/Artist/Shared by).
  - `publicSongApi.ts` — `subscribePublicSongs` (newest 1000 by `sharedAt`).
  - `usePublicSongs.ts` — `usePublicSongs()` and `usePlayableSongs()` (own library + friends' public songs).
  - `DiscoverPage.tsx` at `/discover`: play, play next, add to queue, add to playlist. Rows say "Shared by …"; own songs say "Shared by you" and offer **Make private**. No edit/delete there.
- **UI for owners:** row menu **Make public / Make private** (Library, Home, Search, playlist page for own songs), a **Public** checkbox in the edit modal, **Make public / Make private** bulk button in Library select mode, and a small globe on own public songs.
- **Nav:** Discover (compass icon) in `navItems.ts` → sidebar and mobile tab bar (now `grid-cols-5`, labels truncate).
- **Playlists with friends' songs:** `PlaylistPage`, `FolderContents`, `HomePage` cards, `PlaylistActionsMenu` and the queue restore (`usePlayerLifecycle`) resolve ids against `usePlayableSongs()`. Friends' songs in a playlist show "Shared by …" and have no edit/delete/share items. If some ids no longer resolve, the playlist header says "N songs are no longer available" with **Remove them**.
- `PlaySource.type` gains `'discover'`. `Song` gains `isPublic` and optional `owner`.
- **Tests:** 174 passing. New: `src/features/discover/publicSongs.test.ts` (15 tests), two `LibraryPage` tests (row-menu and bulk make public), Discover route in `AppRoutes.test.tsx`.

## Acceptance criteria
- [x] Owner can toggle a song public/private from the row menu, edit modal and bulk select — `LibraryPage.test.tsx` (row + bulk); edit modal by code review.
- [x] Discover lists, filters and sorts public songs — `publicSongs.test.ts` (`discoverSongs`); route renders — `AppRoutes.test.tsx`.
- [x] Playlists drop songs that were deleted/made private and can clean them up — `unavailableIds`/`mergePlayable` tests.
- [x] Lint, build and tests pass — `npm run lint` (only the known `.claude/launch.json` prettier warning), `npm run build`, `npm run test` (174).
- [ ] Discover and the 5-tab bar look right at 320–375px with the mini-player — needs owner verification (the preview needs a Google sign-in, which the agent can't do).
- [ ] Rules accept and refuse the right writes — needs owner verification (below).
- [ ] Two real accounts: share, discover, play, add to playlist, unshare — needs owner verification (below).

## Deviations from plan
- Commit uses the `phase-4:` prefix like the invite-codes feature, since there's no phase doc for it.
- Soft-deleting a song unshares it, and restoring keeps it private (owner re-shares by hand). Simpler and safer than re-publishing on restore.
- Discover shows songs only; no "browse by friend" page. The Friends/Mine filter and searching a friend's name cover it.

## Deferred / known issues
- **Stale names/copies:** `ownerName` is copied when shared. A later Google name change shows only after the song is re-shared or edited.
- **Removed friends:** their public songs stay in Discover until deleted from `publicSongs` in the console (documented in README).
- **Discover cap:** newest 1000 public songs, no paging. Fine for a friends' app.
- **Upload page** has no "share on upload" option; owners share after uploading.
- **Search page** searches only the user's own library, not public songs.
- Playlist cover mosaics on the Search page still use only own songs.
- Each screen that resolves playlists opens its own `publicSongs` listener. The Firestore SDK shares identical queries, so reads are not multiplied, but a shared store would be cleaner (Phase 5 polish).

## Owner action needed (in this order)
1. **Publish the rules.** Firebase console → Firestore Database → Rules → paste `firestore.rules` → **Publish**. Until then, sharing fails with "Couldn't share…" and Discover shows "Couldn't load Discover".
2. **Rules checks** (two accounts on the friends list, A and B; the Rules Playground helps for the last ones):
   - A: Library → ⋮ on a song → **Make public**. Firestore console shows `publicSongs/{same id}` with A's uid and name, and the private song has `isPublic: true`.
   - B: **Discover** lists the song with "Shared by A". Play it; add it to B's playlist; it plays from there.
   - A: edit the song's title → B sees the new title in Discover and in B's playlist.
   - A: **Make private** → gone from B's Discover; B's playlist says "1 song is no longer available" → **Remove it** works.
   - A: share again, then **Delete** the song → gone from Discover; Settings → Deleted files → restore → it's back in A's library as private.
   - A: share, delete, then purge in Settings → no `publicSongs` doc left.
   - Playground (as B's uid): `update` or `delete` on A's `publicSongs/{id}` → **denied**. `create` of `publicSongs/{x}` with `ownerUid` = B's uid but no matching public song under `users/B/songs/x` → **denied**. `get`/`list` on `publicSongs` as an account not in `allowedUsers` → **denied**.
3. **Device check** at 320–375px: the bottom bar has 5 tabs (Home, Search, Discover, Library, Upload) with readable labels; Discover's filter pills, search and sort fit; row menus open above the mini-player.
4. Phase 4 and invite-code owner checks (handoffs 05, 06) are still open if not done.

## How to run
- `npm run dev` (needs `.env.local`), sign in, open **Discover**.
- `npm run lint` · `npm run build` · `npm run test` (174 tests)

## Next phase
- **Phase 5 — PWA, Polish & Deploy**, `docs/phase-5-pwa-deploy.md`. Know first: Discover adds a fifth tab and a `publicSongs` listener; any service-worker caching of Firestore must not hide that songs were unshared.

## Continuation prompt
```text
You are continuing the Strum project in this repository.

1. Read AGENTS.md and follow it.
2. Read docs/README.md.
3. Read the latest handoff: docs/handoffs/07-public-songs-discover.md
4. Implement Phase 5 — PWA, Polish & Deploy as described in docs/phase-5-pwa-deploy.md.

Before coding, confirm the repo state matches the handoff and list any owner actions from the handoff that are still pending. When the phase is complete, follow the "Definition of done" in AGENTS.md: write the next handoff file, commit, and give me the next continuation prompt.
```
