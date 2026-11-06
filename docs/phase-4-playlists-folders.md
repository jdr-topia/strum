# Phase 4 — Playlists, Folders & Search

**Goal:** organise songs into playlists, group playlists into folders, and find anything fast.

---

## Concepts

```
Library (all songs)
│
├─ 📁 Workout                ← folder
│   ├─ 🎵 Running            ← playlist (ordered songIds)
│   └─ 📁 Gym                ← nested folder (one level, per decision #6)
│       └─ 🎵 Heavy
├─ 📁 Chill
│   └─ 🎵 Late night
└─ 🎵 Road trip              ← root-level playlist (folderId = null)
```
- A song can be in many playlists (and more than once in the same playlist is **not** allowed).
- A playlist belongs to at most one folder.
- Deleting a folder: choose **"Move contents to parent"** (default) or **"Delete folder and its playlists"**. Songs are never deleted by deleting playlists/folders.

## Tasks

### 4.1 Data hooks
`src/features/playlists/usePlaylists.ts`, `src/features/folders/useFolders.ts`
- Live `onSnapshot` of the user's playlists and folders (small collections; load all).
- Derived tree builder: `buildTree(folders, playlists)` → nested nodes sorted by `order` then name. Unit tested.
- `usePlaylistSongs(playlist)` → maps `songIds` to song objects from the already-loaded library (no extra reads); silently skips ids of deleted songs.

### 4.2 Playlist CRUD
`src/features/playlists/playlistApi.ts`
- `createPlaylist({ name, folderId? })`
- `renamePlaylist`, `setDescription`, `setCover` (upload image to Cloudinary)
- `addSongs(playlistId, songIds)` → `updateDoc(..., { songIds: arrayUnion(...ids), updatedAt })` (arrayUnion de-dupes)
- `removeSong(playlistId, songId)` → `arrayRemove`
- `reorder(playlistId, newSongIds)` → overwrite array (optimistic UI, rollback on failure)
- `movePlaylist(playlistId, folderId | null)`
- `deletePlaylist(playlistId)` (confirm dialog)
- `duplicatePlaylist(playlistId)`

### 4.3 Folder CRUD
`src/features/folders/folderApi.ts`
- `createFolder({ name, parentId? })` — enforce max depth.
- `renameFolder`, `moveFolder` (prevent moving into its own descendant), `reorderFolders`.
- `deleteFolder(id, mode)` — batched write: re-parent or delete child playlists/folders.

### 4.4 Sidebar / Library tree
- Desktop sidebar: collapsible folder tree with playlists; expand state remembered in `localStorage`.
- Drag a playlist onto a folder to move it; drag to reorder folders.
- "+ New" button → New playlist / New folder.
- Right-click / `⋯` menu on each node: Rename, Move to…, Delete, (playlist) Play, Shuffle play.
- Mobile: Library tab has segments **Songs | Playlists**; Playlists segment shows the tree with drill-down navigation (`/folder/:id`).

### 4.5 Playlist page (`/playlist/:id`)
- Header: cover (custom, or 2×2 mosaic of first four song covers), name, description, song count, total duration.
- Buttons: **Play**, **Shuffle**, Add songs, `⋯` (edit, move, duplicate, delete).
- Track list with drag-to-reorder (`@dnd-kit/sortable`), remove-from-playlist, and the standard song row menu.
- Sort view options (custom order default / title / artist / recently added) — non-custom sorts are view-only and don't change stored order.
- "Add songs" drawer: searchable list of library songs with checkboxes.

### 4.6 Add-to-playlist dialog
Reused from library rows, multi-select, now-playing, search:
- Searchable list of playlists (shows folder path), checkmarks for playlists that already contain the song(s).
- "New playlist" inline at the top.

### 4.7 Folder page (`/folder/:id`)
Grid of child folders and playlists with covers; breadcrumb back to root.

### 4.8 Search (`/search`)
- Input with 200 ms debounce.
- Primary: **client-side** search over the already-loaded library + playlists (fast, free, works offline). Match title/artist/album/playlist name, ranked: prefix match > word match > substring.
- Results grouped: **Songs**, **Artists** (grouped from songs), **Albums**, **Playlists**.
- Artist / album result → simple filtered view of songs with Play all.
- `searchKeywords` (from Phase 2) is kept so we can switch to Firestore `array-contains` queries if a library ever gets too large to hold in memory.
- Recent searches stored in `localStorage`.

### 4.9 Home page (`/`)
Non-social, built from the user's own data:
- "Continue listening" (resume last queue)
- Recently added songs (last 12)
- Your playlists (recently updated)
- Quick "Shuffle my library" button

---

## Acceptance criteria
- [ ] Create, rename, delete playlists and folders; nest one level; move playlists between folders by drag and by menu.
- [ ] Add songs to playlists from library, search, multi-select and now-playing; no duplicates.
- [ ] Reorder songs in a playlist; order persists across reloads and devices.
- [ ] Deleting a folder offers both modes and never deletes songs.
- [ ] Search returns grouped results within ~50 ms for a 2,000-song library.
- [ ] Play / Shuffle from a playlist sets the queue source to that playlist.
- [ ] Tree builder, folder-move cycle prevention and search ranking have unit tests.

## You provide
- Nothing new.

## Deviations (as built, phase 4)
- **Sidebar drag and drop deferred.** Moving a playlist or folder is done with the `⋯` menu → "Move to…". Dragging playlists onto folders in the sidebar, and reordering folders in the UI, are not built. `reorderFolders` exists in `folderApi.ts` but nothing calls it yet.
- **Custom playlist cover deferred.** Playlists show a mosaic of their first four song covers. `setCover` (Cloudinary upload) is not built. `coverUrl` is read if present.
- **Sort "Recently added" omitted** on the playlist page. Songs carry no per-playlist timestamp, so the order is always custom, title, artist or album.
- **Folder nesting** is enforced in the client only (`folderTree.ts`). `firestore.rules` does not check depth.
- **Library tabs and browse views use URL parameters** (`/library?view=playlists`, `/search?q=…&artist=…` or `&album=…`), so they can be linked and go back.
- **Shuffle play** turns shuffle on for the player. Plain Play keeps the current shuffle setting.
- **Search** shows the first 50 songs and 8 of each group. There is no paging.
