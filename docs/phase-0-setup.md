# Phase 0 — Project Setup

**Goal:** an empty-but-running app wired to Firebase and Cloudinary, with linting, formatting and a basic layout shell.

**Depends on:** Firebase config + Cloudinary cloud name and preset (see [00-what-you-need-to-provide.md](00-what-you-need-to-provide.md)).

---

## Tasks

### 0.1 Scaffold
- `npm create vite@latest . -- --template react-ts`
- Install runtime deps:
  `firebase react-router-dom zustand music-metadata @dnd-kit/core @dnd-kit/sortable lucide-react clsx`
- Install dev deps:
  `tailwindcss @tailwindcss/vite vite-plugin-pwa eslint prettier firebase-tools vitest @testing-library/react jsdom`
- Configure Tailwind (dark theme tokens, accent colour from decision #3).
- Path alias `@/` → `src/` in `vite.config.ts` and `tsconfig.json`.

### 0.2 Environment config
`.env.local` (git-ignored) and `.env.example` (committed):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
VITE_MAX_UPLOAD_MB=50          # optional
VITE_STREAM_QUALITY=128k       # optional: 128k | original
```
`.env.example` already exists at the repo root (created during planning); the owner copies it to `.env.local` and fills it in. A small `src/config/env.ts` validates all are present at startup and throws a readable error if not.

### 0.3 Firebase client
`src/config/firebase.ts`:
- `initializeApp(config)`
- `getAuth()` with `browserLocalPersistence`
- `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })` — offline cache, so library and playlists load instantly and work offline (playback still needs network).

### 0.4 Cloudinary helpers
`src/config/cloudinary.ts`:
- `UPLOAD_URL(resourceType)` → `https://api.cloudinary.com/v1_1/<cloud>/<video|image>/upload`
- `streamUrl(publicId)` → `https://res.cloudinary.com/<cloud>/video/upload/br_128k,f_mp3/<publicId>.mp3` (or original if decision #5 says so)
- `coverUrl(publicId, size)` → `https://res.cloudinary.com/<cloud>/image/upload/c_fill,w_<size>,h_<size>,f_auto,q_auto/<publicId>`

### 0.5 Firebase project files
- `firebase.json` — hosting (`dist`, SPA rewrite to `/index.html`), firestore rules/indexes paths, emulators (auth + firestore).
- `.firebaserc` — default project.
- `firestore.rules` — **deny-all placeholder** (real rules come in Phase 1).
- `firestore.indexes.json` — empty for now.

### 0.6 App shell
- `App.tsx` with React Router and a layout:
  - Desktop: left sidebar (Home, Library, Search, Upload, folders/playlists tree placeholder), main content, bottom player bar.
  - Mobile (<768px): bottom tab bar (Home, Search, Library, Upload) + mini-player above it.
- Placeholder pages for every route:
  ```
  /login
  /                  Home
  /library           Songs
  /upload
  /search
  /playlist/:id
  /folder/:id
  /now-playing       (mobile full-screen player)
  ```
- Shared components: `Button`, `IconButton`, `Modal`, `Menu` (dropdown), `Toast` system, `Cover` (image with fallback gradient), `Spinner`, `EmptyState`.

### 0.7 Tooling
- ESLint (react-hooks, typescript) + Prettier.
- `npm run dev | build | preview | lint | test | emulators`.
- Vitest configured with jsdom.
- `git init` with `.gitignore` (node_modules, dist, .env.local, .firebase).

---

## Acceptance criteria
- [ ] `npm run dev` opens the app shell with working navigation on desktop and mobile widths.
- [ ] Missing env var shows a clear error screen instead of a blank page.
- [ ] `npm run build` and `npm run lint` pass with no errors.
- [ ] `npm run emulators` starts Auth + Firestore emulators.

## You provide
- Firebase web config, Cloudinary cloud name + preset name.
- Answers to the decisions table (or accept defaults).

---

## As built (deviations recorded after Phase 0)
- **Versions:** React 19 (current Vite template) instead of 18; Vite 8; Tailwind 4; TypeScript pinned to `~6.0` because `typescript-eslint` supports only TS < 6.1 (the Vite template now ships TS 7 + oxlint — we kept ESLint as planned).
- **Tailwind config** is CSS-first: theme tokens (`bg`, `surface`, `surface-2`, `border`, `fg`, `muted`, `accent`, `danger`, spacing `player`/`tabbar`) live in `@theme` in `src/index.css`. There is no `tailwind.config.js`.
- **Startup:** `main.tsx` validates env with the pure `parseEnv()` first and renders `ConfigErrorScreen` if anything is missing; Firebase (`src/config/firebase.ts`) and `App` are dynamically imported only after validation. `getEnv()` returns the cached, validated config for the rest of the app.
- **Auth** uses `initializeAuth(app, { persistence: browserLocalPersistence, popupRedirectResolver })` instead of `getAuth()` so persistence is set at creation and popup sign-in is ready for Phase 1.
- **Cloudinary helpers** take an optional config argument (defaults to env) so they can be unit-tested.
- **Toasts:** Zustand store in `src/components/toastStore.ts` with a `toast.info/success/error()` helper usable outside React; `<Toaster />` is mounted in `App`.
- **Routing:** routes live in `src/AppRoutes.tsx` (testable with `MemoryRouter`); `App.tsx` wraps them in `BrowserRouter`. `/login` and `/now-playing` render outside the app layout.
- **Emulators** run with `--project demo-strum` (offline demo project; no login needed). `.firebaserc` default is the real project `strum-5655d` for deploys.
- **`npm run lint`** runs ESLint and `prettier --check`. Prettier ignores Markdown/docs. An ESLint rule blocks `process.env` in `src/`.
- `vite-plugin-pwa` is installed but not configured (Phase 5).
