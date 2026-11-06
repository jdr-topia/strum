# Phase 5 — PWA, Polish & Deploy

**Goal:** friends can install Strum on their phone home screen, it feels like a native app, and it's live on Firebase Hosting.

---

## Tasks

### 5.1 PWA
Using `vite-plugin-pwa`:
- **Manifest:** name/short_name (decision #1), `display: standalone`, theme + background colours, `start_url: /`, icons 192/512 + maskable variant + Apple touch icon.
- **Service worker (Workbox):**
  - Precache app shell (JS/CSS/HTML/fonts).
  - Runtime cache Cloudinary **cover images** (`CacheFirst`, max 500 entries, 30 days).
  - **Do not** cache audio responses (range requests + storage limits) — out of scope; listed as a later feature.
  - `registerType: 'prompt'` → "New version available — Reload" toast.
- **Install prompt:** capture `beforeinstallprompt` on Android/desktop → "Install app" button in profile menu. On iOS show a one-time hint: *Share → Add to Home Screen*.
- iOS meta tags: `apple-mobile-web-app-capable`, status-bar style, safe-area insets (`env(safe-area-inset-*)`) for the bottom player and tab bar.

### 5.2 Offline behaviour
- Firestore persistent cache (Phase 0) means library, playlists and folders render offline.
- Offline banner when `navigator.onLine === false`; disable Upload; playing a song shows "You're offline".

### 5.3 Polish
- Loading skeletons for library, playlist and home.
- Consistent toasts for success/error; friendly error boundary page with "Reload".
- Empty states everywhere (no songs, empty playlist, empty folder, no search results).
- Accessibility pass: focus outlines, ARIA labels on icon buttons, slider roles on seek/volume, keyboard-navigable menus, colour contrast.
- Performance: route-level code splitting (`React.lazy`), lazy-load `music-metadata` only on the Upload page, `loading="lazy"` on covers, small Cloudinary cover sizes (`w_64` in lists, `w_512` in now-playing).
- Settings page: account info, streaming quality toggle (if both offered), deleted files (Phase 2), storage used (sum of `bytes`), sign out.

### 5.4 Testing pass
- Manual test checklist on: Android Chrome (installed PWA), iPhone Safari (installed PWA), desktop Chrome/Edge.
- Run Lighthouse; target PWA installable ✓, Performance ≥ 85 on mobile, Accessibility ≥ 90.
- Run full unit + rules test suites.

### 5.5 Deploy
1. You run once: `npx firebase login`.
2. `npm run build`
3. `npx firebase deploy --only hosting,firestore:rules,firestore:indexes`
4. App is live at `https://<projectId>.web.app` (and `.firebaseapp.com`).
5. Optional custom domain: Firebase Hosting → Add custom domain → add DNS records → add domain to Auth **Authorized domains**.

Add `npm run deploy` script that does build + deploy.

### 5.6 Cloudinary hardening (final check)
- Confirm upload preset restrictions (unsigned, formats, max size, folder, overwrite off).
- Settings → Security: enable **"Restrict media types"** / strict transformations if you want to block arbitrary transformations on your assets (we only use a fixed set: `br_128k,f_mp3` and cover `c_fill` sizes — these can be pre-defined as named transformations).
- Note the usage dashboard URL in the README.

### 5.7 Handover docs
Update root `README.md` with: local setup, env vars, scripts, how to add friends, how to clean up deleted files in Cloudinary, how to deploy, free-tier limits.

---

## Acceptance criteria
- [ ] App installs to home screen on Android and iOS, opens standalone with correct icon and splash colour.
- [ ] New deploy shows "update available" toast to open clients.
- [ ] Library/playlists visible offline; clear offline messaging.
- [ ] Lighthouse targets met.
- [ ] Live on `<projectId>.web.app`; you and at least one friend can sign in, upload and play.

## You provide
- `npx firebase login` on your machine.
- App icon (512×512 PNG) — optional; placeholder otherwise.
- Custom domain + DNS access — optional.

---

## After launch (optional future work)
| Feature | Notes |
|---|---|
| Real Cloudinary deletes | One callable Cloud Function holding the API secret; requires Blaze plan (still ~free at this scale) |
| Offline song downloads | Cache selected songs' audio in IndexedDB / Cache Storage |
| Native iOS app | Capacitor wrapper for reliable background audio |
| Lyrics | Manual paste or `.lrc` upload, synced display |
| Equaliser / crossfade | Web Audio API on top of the engine |
