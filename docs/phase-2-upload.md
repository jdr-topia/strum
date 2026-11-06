# Phase 2 — Upload & Song Library

**Goal:** users can upload audio files (single or bulk), review/edit metadata, and see their library. Songs can be edited and (soft-)deleted.

---

## Upload flow

```
Pick / drop files
   │
   ▼
For each file (in browser):
   1. Validate type (audio/*) and size (≤ max from decision #4)
   2. parseBlob(file) with music-metadata
        → title, artist, album, duration, embedded picture
        → fallback: title = filename without extension, artist = "Unknown Artist"
   3. Show in review list (editable title / artist / album, cover preview)
   │
   ▼  user clicks "Upload all"
Upload queue (2 concurrent):
   4. If cover art: POST image → Cloudinary  (folder strum/covers/<uid>)
   5. POST audio → Cloudinary /video/upload  (folder strum/songs/<uid>)
        - XHR for progress events
        - returns public_id, secure_url, bytes, duration, format, delete_token
   6. addDoc(users/<uid>/songs, {...})
        - if this fails → call Cloudinary /delete_by_token with delete_token (valid 10 min) to avoid orphans
   7. Mark row done ✓  (or error with Retry button)
```

## Tasks

### 2.1 Metadata extraction
`src/features/upload/extractMetadata.ts`
- `parseBlob(file, { duration: true, skipCovers: false })`.
- Convert `common.picture[0]` to a `Blob` for preview + upload.
- If `format.duration` is missing, fall back to loading the file into a temporary `<audio>` and reading `duration` on `loadedmetadata`.
- Unit tests with small fixture files (mp3 with tags, m4a, file with no tags).

### 2.2 Cloudinary uploader
`src/features/upload/cloudinaryUpload.ts`
```ts
uploadToCloudinary(file: Blob, opts: {
  resourceType: 'video' | 'image',
  folder: string,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
}): Promise<CloudinaryResult>
```
- `FormData`: `file`, `upload_preset`, `folder`, `tags` (`strum,<uid>`), `context` (`title=…|artist=…` — handy for console cleanup).
- XHR so we get `upload.onprogress`; supports cancel.
- Normalises errors (file too large, format not allowed, network) into user-friendly messages.
- `deleteByToken(token)` helper.

### 2.3 Upload queue store
`src/features/upload/uploadStore.ts` (Zustand)
- Items: `{ id, file, meta, coverBlob, status: 'pending'|'uploading'|'saving'|'done'|'error', progress, error }`.
- Concurrency limit 2; retry failed; cancel pending; clear finished.
- Warns on `beforeunload` while uploads are in progress.
- Queue keeps running while user navigates elsewhere in the app; a small progress badge shows on the Upload nav item.

### 2.4 Upload page UI
- Drag-and-drop zone + "Choose files" button (`accept="audio/*"`, `multiple`).
- Review table: cover thumb, editable title/artist/album, duration, size, remove button.
- "Apply artist/album to all" helper for album uploads.
- Per-row progress bar; overall progress at top.
- Duplicate hint: if a song with the same title+artist+duration (±2s) already exists, show "Looks like a duplicate" with option to skip.

### 2.5 Song library page (`/library`)
- Live list via `onSnapshot(query(songs, where('deleted','==',false), orderBy('createdAt','desc')))`.
- Columns: cover, title, artist, album, duration; compact rows on mobile.
- Sort: recently added (default), title, artist, album.
- Client-side filter box (instant filter over loaded songs).
- Row actions menu: Play, Play next, Add to queue, Add to playlist (wired in Phase 4), Edit info, Delete.
- Multi-select (checkboxes / long-press on mobile) for bulk delete and bulk add-to-playlist.
- Empty state with "Upload your first song" CTA.
- Library expected size is hundreds to low thousands of songs; load all, virtualise the list with `@tanstack/react-virtual` if > 500.

### 2.6 Edit song
Modal: title, artist, album, replace cover (uploads new image). Updates `searchKeywords` too.

### 2.7 Delete song (soft delete)
- Sets `deleted: true`; removes song id from all of the user's playlists (batched write).
- Toast with **Undo** (5 s).
- Settings page has **"Deleted files"** section listing soft-deleted songs with:
  - Restore
  - **Copy Cloudinary IDs** (for you to bulk-delete in the Cloudinary console Media Library)
  - "I've removed them from Cloudinary" → hard-deletes the Firestore docs.

### 2.8 Search keywords helper
`src/lib/keywords.ts`: lowercase, strip diacritics/punctuation, split title/artist/album into words, plus prefixes of each word (min 2 chars) so `array-contains` can do prefix search in Phase 4. Capped at ~50 entries.

### 2.9 Composite index
`firestore.indexes.json`: `songs` on `(deleted ASC, createdAt DESC)`.

---

## Acceptance criteria
- [ ] Upload 10 MP3s at once; progress is shown, all appear in the library with correct tags and covers.
- [ ] Files with no tags get sensible defaults and can be edited before upload.
- [ ] Too-large or wrong-type files are rejected before upload with a clear message.
- [ ] If the Firestore save fails, the Cloudinary asset is removed via delete token.
- [ ] Edit and delete (with undo) work; deleted songs vanish from playlists.
- [ ] Library of 1,000 songs scrolls smoothly on a mid-range phone.

## You provide
- A handful of test audio files with a mix of formats (mp3, m4a) and some without tags/cover art.
