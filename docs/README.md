# Strum — Project Plan

A private music player for a small group of friends. Each user signs in, uploads their own songs, organises them into playlists and folders, and plays them in the browser (installable as a PWA on phones). Users can choose to share single songs with the other friends through **Discover**.

**There is no backend server.** The client talks directly to:

| Service | Used for |
|---|---|
| **Firebase Auth** | Google sign-in |
| **Cloud Firestore** | Song metadata, playlists, folders, allowlist |
| **Firebase Hosting** | Serving the built static app (not a server) |
| **Cloudinary (free)** | Storing and streaming audio files and cover art |

Every user's library is **private by default**. The one sharing feature is **public songs**: an owner can make a song public, and then every allowed user can find it in **Discover**, play it, queue it and add it to their own playlists. Only the owner can edit, delete or unshare it. Discover shows the owner's display name (never their email).

Other social features (public playlists, collaborators, likes, comments, friends' activity) are **out of scope**.

---

## Documents

| File | What it covers |
|---|---|
| [00-what-you-need-to-provide.md](00-what-you-need-to-provide.md) | Accounts, keys and decisions I need from you |
| [phase-0-setup.md](phase-0-setup.md) | Project scaffold, tooling, Firebase + Cloudinary configuration |
| [phase-1-auth.md](phase-1-auth.md) | Google login, friends allowlist, Firestore security rules |
| [phase-2-upload.md](phase-2-upload.md) | Metadata extraction, Cloudinary upload, song library |
| [phase-3-player.md](phase-3-player.md) | Audio engine, queue, mini-player, now-playing, lock-screen controls |
| [phase-4-playlists-folders.md](phase-4-playlists-folders.md) | Playlists, folders, reordering, search |
| [phase-5-pwa-deploy.md](phase-5-pwa-deploy.md) | PWA install, polish, deployment |

Phases are sequential; each one ends with a working, testable app.

---

## Architecture

```
┌────────────────────────────────────────┐
│        Strum client (React PWA)        │
│                                        │
│  UI (routes/screens)                   │
│   ├─ Player store (Zustand) ── <audio> │
│   ├─ Data hooks (Firestore listeners)  │
│   └─ Upload queue                      │
└──────┬─────────────────────┬───────────┘
       │                     │
       ▼                     ▼
  Firebase               Cloudinary
  • Auth (Google)        • Unsigned upload preset
  • Firestore            • strum/songs/<uid>/…  (audio, resource_type=video)
  • Hosting              • strum/covers/<uid>/… (images)
                         • Streams audio via CDN (range requests → seeking)
```

### Tech stack

| Concern | Choice | Why |
|---|---|---|
| Build | Vite 8 + React 19 + TypeScript 6 | Fast, simple, static output (TS pinned to ~6.0 because typescript-eslint does not support TS 7 yet) |
| Styling | Tailwind CSS 4 (CSS-first `@theme` tokens in `src/index.css`) | Quick to build a consistent dark music-app UI |
| Routing | React Router | Standard |
| Player / UI state | Zustand | Tiny, works outside React render cycle (needed for audio) |
| Server data | Firestore `onSnapshot` + small custom hooks | Live updates across devices, offline cache |
| Metadata | `music-metadata` (browser build) | Reads ID3/MP4 tags + embedded cover art client-side |
| Drag & drop | `@dnd-kit` | Playlist reordering |
| PWA | `vite-plugin-pwa` | Manifest + service worker |
| Icons | `lucide-react` | Clean icon set |

---

## Data model (Firestore)

All user data lives **under the user's own document**, which makes security rules trivial and keeps libraries private. The only exception is `publicSongs`, a top-level copy of the songs their owners chose to share.

```
allowedUsers/{email}                  ← added by you in the app/console, or by a friend redeeming an invite
  addedAt: timestamp
  note?: string                       ← e.g. "Rahul"
  inviteCode?: string                 ← set when the friend joined with an invite

admins/{email}                        ← added once by hand in the console (the owner)
  addedAt: timestamp

invites/{code}                        ← the code (12 characters) is the document id
  createdBy: string                   ← admin's email
  createdAt: timestamp
  expiresAt: timestamp
  maxUses: number                     ← 1–50
  uses: number                        ← +1 for each friend who joins with it
  note: string                        ← e.g. "Rahul", up to 100 characters

users/{uid}
  displayName: string
  email: string
  photoURL: string | null
  createdAt: timestamp
  lastQueue?: { songIds: string[], index: number, positionSec: number }   ← resume playback

users/{uid}/songs/{songId}
  title: string
  artist: string
  album: string | null
  durationSec: number
  cloudinaryPublicId: string
  audioUrl: string                    ← secure_url from Cloudinary
  format: string                      ← mp3, m4a, …
  bytes: number
  coverPublicId: string | null
  coverUrl: string | null
  searchKeywords: string[]            ← lowercase tokens from title/artist/album
  deleted: boolean                    ← soft delete (see phase 2)
  isPublic?: boolean                  ← shared in Discover (missing = false); see publicSongs
  createdAt: timestamp

publicSongs/{songId}                  ← same id as the owner's private song
  ownerUid: string                    ← only this user can write or delete it
  ownerName: string                   ← owner's display name when shared ("A friend" if none), ≤ 100
  title, artist, album, durationSec, cloudinaryPublicId, audioUrl, format, bytes,
  coverPublicId, coverUrl, searchKeywords, createdAt   ← copied from the private song
  sharedAt: timestamp                 ← set when made public; Discover sorts by it

users/{uid}/playlists/{playlistId}
  name: string
  description: string | null
  coverUrl: string | null             ← custom, else derived from first songs
  folderId: string | null
  songIds: string[]                   ← ordered
  createdAt, updatedAt: timestamp

users/{uid}/folders/{folderId}
  name: string
  parentId: string | null             ← allows nested folders
  order: number
  createdAt: timestamp
```

**Hierarchy:** Folder → Playlists → Songs (Spotify-style). A playlist can sit at the root (`folderId: null`) or inside one folder.

**Public songs (Discover).** Making a song public writes `isPublic: true` on the private song and creates `publicSongs/{songId}` **in one batch**; making it private flips the flag and deletes the copy. The rules only accept a `publicSongs` write when the owner's private song with the same id is public and not deleted after that batch, so the two can't drift apart.

- **Edit** (title, artist, album, cover): the public copy is updated in the same batch.
- **Soft delete:** the song is also unshared (`isPublic: false`, copy deleted). Restoring does not re-share it.
- **Hard delete:** the private doc and any leftover copy are deleted together.
- **Others' playlists** keep the song id. A playlist resolves ids against the user's own library *plus* everyone's public songs, so a song that was deleted or made private simply drops out; the playlist page says "N songs are no longer available" with a **Remove them** button. The same applies to a saved queue.
- Removing a friend from `allowedUsers` does **not** remove their public songs. Delete their `publicSongs` docs in the console if needed.
- Cloudinary URLs were already public to anyone who has the link; sharing only makes them findable inside Strum.

---

## Key constraints of going serverless

1. **Unsigned uploads.** The Cloudinary API secret can never be in client code, so uploads use an *unsigned upload preset* restricted by format, size and folder. Anyone who extracts the preset name could upload to the account; acceptable for a friends-only app, and fixable by renaming the preset.
2. **No permanent deletes from the client.** Deleting a Cloudinary asset requires a signed request. We soft-delete in Firestore and clean up in the Cloudinary console occasionally. A single optional Cloud Function can automate this later (needs Firebase Blaze plan).
3. **Free tier budget.** Cloudinary free ≈ 25 credits/month (1 credit ≈ 1 GB storage *or* 1 GB bandwidth *or* 1,000 transformations). Storage and streaming share the budget. We stream a 128 kbps transcode to keep bandwidth down.
4. **iOS background audio** in PWAs is unreliable (may pause on lock/switch). Android and desktop are fine. If needed later, wrap the same code with Capacitor for a native iOS shell.

---

## Folder structure (target)

```
strum/
├─ docs/                       ← these plans
├─ public/                     ← icons, manifest assets
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                  ← router + layout
│  ├─ config/
│  │  ├─ firebase.ts           ← initializeApp, auth, db
│  │  └─ cloudinary.ts         ← cloud name, preset, URL helpers
│  ├─ features/
│  │  ├─ auth/                 ← AuthProvider, useAuth, LoginPage, RequireAuth
│  │  ├─ library/              ← songs list, song row, song actions
│  │  ├─ upload/               ← upload queue, metadata extraction, UploadPage
│  │  ├─ player/               ← audio engine, store, MiniPlayer, NowPlaying, Queue
│  │  ├─ playlists/            ← playlist list/detail/edit, add-to-playlist dialog
│  │  ├─ folders/              ← folder tree, folder CRUD
│  │  ├─ discover/             ← public songs: Discover page, publicSongs reader, helpers
│  │  └─ search/
│  ├─ components/              ← shared UI (Button, Modal, Menu, Toast, Cover, …)
│  ├─ lib/                     ← firestore helpers, formatters, keywords
│  └─ types/                   ← Song, Playlist, Folder, …
├─ firestore.rules
├─ firestore.indexes.json
├─ firebase.json
├─ .env.example
└─ package.json
```

---

## Adding friends

Only emails in `allowedUsers` can use Strum. There are two ways to add someone, and no admin script:

**Invite codes (normal way).** Admins have an **Invites** section in **Settings**:

1. Choose who it's for (optional note), how many people can use it (1, 5 or 10) and how long it lasts (1, 7 or 30 days) → **Create invite**.
2. Send the code to your friend. They sign in with Google, and on the "not on the list" screen they enter the code under "Have an invite code?".
3. They're added to `allowedUsers` straight away, and the invite's `uses` goes up by one.

Revoke an invite from the same section to stop it working. Friends who already joined keep access.

**Manual (console).** Firebase console → **Firestore Database** → **Data** → collection `allowedUsers` → **Add document**. Document ID = the friend's Google email, **all lowercase**. Add `addedAt` (timestamp) and optionally `note`.

**Removing a friend:** Settings → **Friends** → **Remove**. It takes effect straight away. Their `users/{uid}` data and songs stay in the database.

**Becoming an admin (one time).** Add a document to collection `admins`, with ID = your Google email in lowercase and a field `addedAt` (timestamp). Until this exists, the Invites and Friends sections don't appear, but everything else works.

Security rules live in `firestore.rules`; publish them by pasting the file into **Firestore Database → Rules → Publish**. There is no Firebase CLI in this project.

---

## Out of scope (possible later additions)

- Cloud Function for real Cloudinary deletion
- Lyrics
- Offline downloads of songs (cache audio in the service worker)
- Native iOS/Android wrapper via Capacitor
- Social features beyond public songs (public playlists, likes, comments, activity)
