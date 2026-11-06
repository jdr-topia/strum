# What You Need to Provide

Everything below is needed before or during the phase listed. Nothing here is secret except where marked — Firebase web config and the Cloudinary cloud name/preset are designed to live in client code.

> **Never send me** your Cloudinary **API secret**, your Google account password, or any Firebase service-account JSON. The app doesn't need them.

---

## Before Phase 0

### 1. Tools on your machine
- [ ] **Node.js 20 LTS or newer** — check with `node -v`
- [ ] **Git** (optional but recommended) — check with `git --version`
- [ ] **Firebase CLI** — I can install it as a dev dependency, but you'll need to run `npx firebase login` yourself once (it opens a browser to sign in)

### 2. Firebase project
1. Go to <https://console.firebase.google.com> → **Add project** → name it (e.g. `strum`). Google Analytics: off is fine.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.** Pick a support email.
3. **Build → Firestore Database → Create database** → *Production mode* → choose a region close to your friends (e.g. `asia-south1` for India). Region can't be changed later.
4. **Project settings (gear) → General → Your apps → Web app (`</>`)** → register app named `strum-web`. Tick "Also set up Firebase Hosting".
5. Copy the `firebaseConfig` object it shows.

**Send me:**
```
apiKey:            ...
authDomain:        ...
projectId:         ...
storageBucket:     ...
messagingSenderId: ...
appId:             ...
```
(Or just paste the whole `firebaseConfig` block.)

### 3. Cloudinary account
1. Sign up free at <https://cloudinary.com>.
2. Dashboard → note your **Cloud name**.
3. **Settings (gear) → Upload → Upload presets → Add upload preset** with:
   | Setting | Value |
   |---|---|
   | Preset name | something non-obvious, e.g. `strum_u_7k2p` |
   | Signing mode | **Unsigned** |
   | Asset folder | `strum` |
   | Use filename / unique filename | Unique filename **on** |
   | Overwrite | **off** |
   | Allowed formats | `mp3,m4a,aac,ogg,opus,flac,wav,jpg,jpeg,png,webp` |
   | Max file size | `52428800` (50 MB) — free plan hard limit is 100 MB for video |
   | Return delete token | **on** (lets the app undo an upload within 10 min if the Firestore write fails) |
4. Save.

**Send me:**
```
Cloud name:          ...
Upload preset name:  ...
```

---

## Before Phase 1

### 4. Friends allowlist
- [ ] The **Google email addresses** of everyone allowed in (including yours).

You'll add these yourself in Firestore → collection `allowedUsers` → document ID = the email (lowercase), field `addedAt` (timestamp). I'll also give you a one-line script option in Phase 1.

### 5. Authorized domains (only if you use a custom domain)
Firebase Auth → Settings → Authorized domains. `localhost` and `<project>.web.app` are there by default. Tell me if you'll use a custom domain.

---

## Decisions I need from you

Defaults are in **bold** — if you don't answer I'll use them.

| # | Question | Options |
|---|---|---|
| 1 | App name shown in UI and on phone home screen | **Strum** / other |
| 2 | Theme | **Dark only** / dark + light toggle |
| 3 | Accent colour | **Emerald** / give me a hex |
| 4 | Max upload size per file | **50 MB** / other (≤100 MB) |
| 5 | Streaming quality | **128 kbps transcode** (saves bandwidth) / original file |
| 6 | Nested folders | **Yes, one level of nesting** / flat folders only / unlimited |
| 7 | Can one song be in many playlists? | **Yes** |
| 8 | Who are the users mostly on? | Android / **mixed** / iPhone (affects whether we plan Capacitor) |
| 9 | Package manager | **npm** / pnpm / yarn |

---

## Before Phase 5 (deploy)

- [ ] Run `npx firebase login` on your machine (I can't do the browser sign-in for you).
- [ ] An app icon (512×512 PNG, square) — optional; I'll generate a simple placeholder if you don't have one.
- [ ] Custom domain, if any.

---

## Ongoing (your responsibility)

- Adding/removing friends in `allowedUsers`.
- Watching Cloudinary usage (Dashboard → Usage) once a month.
- Occasionally purging soft-deleted files in Cloudinary (I'll provide an in-app "Export deleted file IDs" button in Phase 2 to make this easy).
