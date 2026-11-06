# Strum — Project Plan

A private music player for a small group of friends. Each user signs in, uploads their own songs, organises them into playlists and folders, and plays them in the browser (installable as a PWA on phones).

**There is no backend server.** The client talks directly to:

| Service | Used for |
|---|---|
| **Firebase Auth** | Google sign-in |
| **Cloud Firestore** | Song metadata, playlists, folders, allowlist |
| **Firebase Hosting** | Serving the built static app (not a server) |
| **Cloudinary (free)** | Storing and streaming audio files and cover art |

Social features (shared songs, public playlists, collaborators, likes, friends' activity) are **out of scope**. Every user's library is private to them.

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

All user data lives **under the user's own document**, which makes security rules trivial and keeps libraries private.

```
allowedUsers/{email}                  ← you add these by hand in the console
  addedAt: timestamp
  note?: string                       ← e.g. "Rahul"

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
  createdAt: timestamp

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

## Out of scope (possible later additions)

- Cloud Function for real Cloudinary deletion
- Lyrics
- Offline downloads of songs (cache audio in the service worker)
- Native iOS/Android wrapper via Capacitor
- Any social/sharing features
