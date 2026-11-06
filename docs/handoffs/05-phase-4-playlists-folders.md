# Handoff — Phase 4 — Playlists, Folders & Search

**Date:** 2026-11-06
**Phase doc:** docs/phase-4-playlists-folders.md
**Status:** Complete with deferrals
**Last commit:** see `git log -1` (commit "phase-4: add handoff"); code commit is `bf8d1b2 phase-4: add playlists, folders, sidebar tree and search`

## What was built
- **Data layer**
  - `src/features/playlists/playlistApi.ts`: create, rename, description, add songs (`arrayUnion`), remove song, reorder, move, delete, duplicate.
  - `src/features/folders/folderApi.ts`: create, rename, move (with checks), reorder (API only), delete with `move` or `delete` mode. Deletes write playlists before the folder doc, so a failure part-way can be retried.
  - Live hooks: `usePlaylists.ts`, `useFolders.ts`.
  - Types: `src/types/playlist.ts`, `src/types/folder.ts`.
- **Pure logic (tested)**
  - `src/features/folders/folderTree.ts`: `buildTree`, `folderMoveError`, `folderCreateError`, `nextOrder`, `flattenFolders`, `folderPath`. One nested level is enforced here.
  - `src/features/search/searchEngine.ts`: `buildSearchIndex`, `matchScore`, `runSearch` (songs, artists, albums, playlists).
  - `src/features/playlists/resolvePlaylistSongs.ts`: maps song ids to library songs, skipping deleted ones.
- **Sidebar**: `src/features/playlists/SidebarPlaylists.tsx` replaces the placeholder. It is a collapsible folder tree; expanded state is kept in `localStorage` (`strum.sidebar.expanded`).
- **Library**: `LibraryPage.tsx` gains a Songs | Playlists switch (`?view=playlists`) and "Add to playlist" in multi-select.
- **Folder pages**: `FolderPage.tsx` (breadcrumb, folder menu), `FolderContents.tsx` (shared grid for the library root and folders), `FolderCard.tsx`, `NewItemMenu.tsx`, `FolderActionsMenu.tsx`, `MoveToDialog.tsx`.
- **Playlist page**: `PlaylistPage.tsx` (header with mosaic cover, total duration, Play, Shuffle, Add songs, description). It has a track list with drag reorder (`SortableTrack.tsx`, keyboard supported) and remove-from-playlist. Sort is view-only except custom order. Also `PlaylistActionsMenu.tsx`, `PlaylistCard.tsx`, `PlaylistCover.tsx`, `AddSongsDialog.tsx`, `playPlaylist.ts` (sets the queue source to the playlist).
- **Add to playlist**: `AddToPlaylistDialog.tsx` (search, checks for playlists that already contain the songs, inline "create and add"). Reached from song row menus, library multi-select, search and now-playing (`NowPlayingPage.tsx`).
- **Song actions**: `useSongActions.tsx` bundles edit, delete and add-to-playlist for any song list. `useDeleteSongs.ts` now holds the delete-with-undo logic that used to live in `LibraryPage`.
- **Search**: `SearchPage.tsx`. The input is debounced 200 ms and kept in `?q=`. Results are grouped (songs, artists, albums, playlists). Artist and album results open a filtered view with Play all. Recent searches are in `recentSearches.ts`.
- **Home**: `HomePage.tsx`. Continue listening (current queue), Recently added (12), Your playlists (6, most recently updated), Shuffle my library.
- **Shared UI**: `src/components/NamePromptModal.tsx`, `src/components/ConfirmModal.tsx`, `src/lib/errors.ts` (`ValidationError`, `friendlyError`), `src/lib/useDebouncedValue.ts`, `formatTotalDuration` in `src/lib/formatters.ts`.
- **SongRow** gained optional props: `onAddToPlaylist`, `onRemoveFromPlaylist`, `dragHandle`, `rowRef`, `rowStyle`. Existing callers are unchanged.
- **Tests**: 141 passing (116 before). New: `folderTree.test.ts`, `searchEngine.test.ts`, `resolvePlaylistSongs.test.ts`, `formatTotalDuration.test.ts`.
  - `AppRoutes.test.tsx` and `LibraryPage.test.tsx` now mock `playlistApi` and `folderApi`, because the new screens import Firebase. The playlist and folder route tests now expect the fixture headings ("Road trip", "Workout").
- **Firestore rules**: no change. The existing `playlists` and `folders` rules cover every write used here. The rules do not enforce folder depth or `songIds` uniqueness; the client does (see deviations).
- **Data model** (`docs/README.md`): no change. Fields used match the existing model.

## Acceptance criteria
- [ ] Create, rename, delete playlists and folders; nest one level; move playlists between folders by drag and by menu — create, rename, delete and "Move to…" are implemented. Drag is deferred (see below). needs owner verification: create, rename, delete and move from the sidebar and from the Library → Playlists tab on desktop and phone.
- [ ] Add songs to playlists from library, search, multi-select and now-playing; no duplicates — implemented via `arrayUnion`; the dialog marks playlists that already have the songs. needs owner verification on each of the four entry points.
- [ ] Reorder songs in a playlist; order persists across reloads and devices — implemented (optimistic, rolled back on failure). needs owner verification: drag on desktop and phone, reload, second device.
- [ ] Deleting a folder offers both modes and never deletes songs — implemented in `FolderActionsMenu.tsx` and `folderApi.deleteFolder`. needs owner verification: both modes, and that songs stay in the library.
- [ ] Search returns grouped results within ~50 ms for a 2,000-song library — grouping and ranking are implemented, but timing was not measured. needs owner verification: with a real library of about 2,000 songs.
- [x] Play / Shuffle from a playlist sets the queue source to that playlist — `playPlaylist.ts` passes `{type:'playlist', id, name}`. Verified by reading the code only. needs owner verification: "Playing from …" on the now-playing screen and the queue panel.
- [x] Tree builder, folder-move cycle prevention and search ranking have unit tests — `folderTree.test.ts` (tree, move and create rules), `searchEngine.test.ts` (ranking and grouping).

Checks run: `npm run lint`, `npm run build` and `npm run test` all pass (141 tests).

## Deviations from plan
Also written into `docs/phase-4-playlists-folders.md` under "Deviations (as built, phase 4)".
- **Sidebar drag and drop not built.** Use the `⋯` menu → "Move to…". Folder reorder UI not built; `reorderFolders` exists but nothing calls it.
- **Custom playlist cover not built** (`setCover`). Playlists show a mosaic of the first four songs' covers. `coverUrl` is read if present.
- **"Recently added" sort omitted** on the playlist page; songs have no per-playlist timestamp.
- **Folder depth** is checked in the client only.
- **Library tabs and browse views use URL params** (`?view=playlists`, `?q=…&artist=…` / `&album=…`).
- **Shuffle play** turns the player's shuffle on. Plain Play keeps the current setting.
- **Search** shows 50 songs and 8 per other group. No paging.
- **Folder "Play" omitted** from the folder menu. The plan listed it only for playlists.

## Deferred / known issues
- Sidebar drag and drop (playlist to folder, folder reorder) — needs a drag UI in `SidebarPlaylists.tsx`, which already has the tree; `reorderFolders` is ready. Pick up in phase 5 polish or a follow-up.
- Custom playlist cover upload (`setCover`) — reuse `uploadToCloudinary` as `EditSongModal.tsx` does, with a playlist cover field. Phase 5 or later.
- The browser was not run for Phase 4. The app needs Google sign-in with an allowlisted account, and the agent cannot sign in. All UI behaviour is untested in a real browser (see acceptance criteria above).
- Cross-device playlist changes rely on the Firestore listeners; not tested with two devices.
- Each playlist/folder menu and page opens its own Firestore listeners. Firestore de-duplicates identical queries, so this is fine for a friends' library, but worth watching if libraries grow.
- Undo after a song delete still does not put the song back into its playlists (existing Phase 2 behaviour).
- Phase 3 items still open: the owner's device checks (see handoff 04).

## Owner action needed
- **Restore `.env.example`.** The working tree still shows it deleted (`git status`: `D .env.example`). It is not part of any phase commit; restore it with `git checkout -- .env.example` once you're happy with it. Do not commit `.env.local`.
- **Check the Phase 2 composite index** on `songs` (deleted ASC, createdAt DESC) exists in the Firebase console (handoff 03). Playlists and folders need no new indexes; the queries are single-collection, unordered or on one field.
- **Check the playlist and folder flows on a phone and a desktop**: create, rename, move, delete (both folder modes), add to playlist from each entry point, reorder, Play and Shuffle from a playlist, search with a large library, Home.
- **No Firestore rules to publish** for this phase (the rules were not changed).

## How to run
- `npm install`
- `npm run dev`, then http://localhost:5173 (needs `.env.local`)
- `npm run lint` · `npm run build` · `npm run test` (141 tests)

## Next phase
- **Phase 5 — PWA, Polish & Deploy**, `docs/phase-5-pwa-deploy.md`.
- Things the next agent must know first:
  - The Phase 4 owner checks above are still open. Phase 5 starts with them still pending.
  - Phase 5 polish candidates from this phase: sidebar drag and drop, custom playlist covers.
  - `SidebarPlaylists.tsx` is the place for drag-and-drop. `reorderFolders` (`folderApi.ts`) is ready.

## Continuation prompt
```text
You are continuing the Strum project in this repository.

1. Read AGENTS.md and follow it.
2. Read docs/README.md.
3. Read the latest handoff: docs/handoffs/05-phase-4-playlists-folders.md
4. Implement Phase 5 — PWA, Polish & Deploy as described in docs/phase-5-pwa-deploy.md.

Before coding, confirm the repo state matches the handoff and list any owner actions from the handoff that are still pending. When the phase is complete, follow the "Definition of done" in AGENTS.md: write the next handoff file, commit, and give me the next continuation prompt.
```
