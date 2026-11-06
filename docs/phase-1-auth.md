# Phase 1 — Authentication & Friends Allowlist

**Goal:** only people on your allowlist can sign in and touch any data. Everyone else sees a polite "not invited" screen.

---

## Flow

```
Open app
  │
  ├─ not signed in ──► /login ──► "Continue with Google" (popup; redirect on mobile Safari)
  │
  └─ signed in
        │
        ├─ read allowedUsers/{email}
        │     ├─ missing ──► "You're not on the list" screen + Sign out
        │     └─ exists
        │            │
        │            ├─ users/{uid} missing? create it (displayName, email, photoURL, createdAt)
        │            └─ enter app
```

## Tasks

### 1.1 Auth provider
`src/features/auth/AuthProvider.tsx`
- Subscribes to `onAuthStateChanged`.
- Exposes `useAuth()` → `{ status: 'loading' | 'signedOut' | 'notAllowed' | 'ready', user, signIn, signOut }`.
- After sign-in: `getDoc(allowedUsers/<email lowercase>)`.
- On first allowed sign-in: create `users/{uid}` with `setDoc(..., { merge: true })`.

### 1.2 Sign-in method
- `signInWithPopup(GoogleAuthProvider)` on desktop.
- Fall back to `signInWithRedirect` when popup is blocked or on iOS standalone PWA (popups don't work there); handle `getRedirectResult` on load.

### 1.3 Route guard
`RequireAuth` wraps all app routes; renders a full-screen loader while `status === 'loading'`, redirects to `/login` when signed out, shows `NotInvitedPage` when not allowed.

### 1.4 Profile menu
Avatar in the top-right/sidebar footer → menu with name, email, **Sign out**.

### 1.5 Firestore security rules
`firestore.rules`:
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function email()    { return request.auth.token.email.lower(); }
    function isFriend() {
      return signedIn()
        && request.auth.token.email_verified == true
        && exists(/databases/$(database)/documents/allowedUsers/$(email()));
    }
    function isMe(uid) { return isFriend() && request.auth.uid == uid; }

    // Each user may check only their own allowlist entry. Nobody writes via client.
    match /allowedUsers/{e} {
      allow get:   if signedIn() && e == email();
      allow list, write: if false;
    }

    match /users/{uid} {
      allow read, write: if isMe(uid);

      match /songs/{songId} {
        allow read, delete: if isMe(uid);
        allow create, update: if isMe(uid) && validSong(request.resource.data);
      }
      match /playlists/{playlistId} {
        allow read, delete: if isMe(uid);
        allow create, update: if isMe(uid) && validPlaylist(request.resource.data);
      }
      match /folders/{folderId} {
        allow read, delete: if isMe(uid);
        allow create, update: if isMe(uid) && validFolder(request.resource.data);
      }
    }

    function validSong(d) {
      return d.title is string && d.title.size() > 0 && d.title.size() <= 200
        && d.artist is string && d.artist.size() <= 200
        && d.cloudinaryPublicId is string
        && d.audioUrl is string && d.audioUrl.matches('https://res\\.cloudinary\\.com/.*')
        && d.durationSec is number
        && d.deleted is bool;
    }
    function validPlaylist(d) {
      return d.name is string && d.name.size() > 0 && d.name.size() <= 100
        && d.songIds is list && d.songIds.size() <= 5000;
    }
    function validFolder(d) {
      return d.name is string && d.name.size() > 0 && d.name.size() <= 100;
    }
  }
}
```
Published by pasting `firestore.rules` into Firebase console → Firestore Database → Rules → **Publish** (no CLI — see "As built").

### 1.6 Rules tests
Using `@firebase/rules-unit-testing` against the emulator:
- Unauthenticated user → denied everywhere.
- Signed-in but not allowlisted → denied on `users/*`.
- Allowlisted user A → can CRUD own data, **cannot** read user B's songs.
- Invalid song doc (empty title, non-Cloudinary URL) → rejected.

### 1.7 Adding friends
Two ways (documented in the README):
1. **Console:** Firestore → `allowedUsers` → Add document → ID = `friend@gmail.com` (lowercase) → field `addedAt` (timestamp).
2. **Script:** `npm run allow -- friend@gmail.com` — a tiny Node script using the Firebase CLI's logged-in credentials via the Admin SDK *on your machine only* (never shipped to the client).

---

## Acceptance criteria
- [ ] You can sign in with Google; your `users/{uid}` doc is created.
- [ ] A Google account not in `allowedUsers` sees the "not invited" screen and can't read/write anything (verified in rules tests).
- [ ] Sign-out works; reloading keeps you signed in.
- [ ] Sign-in works on Android Chrome, desktop Chrome/Edge, and iOS Safari.
- [ ] Rules tests pass.

## You provide
- List of friends' Google emails (add them yourself to `allowedUsers`, starting with your own).

---

## As built (deviations recorded after Phase 1)
- **No Firebase CLI / emulators / Admin SDK** (owner decision). Consequences:
  - **1.5** Rules are published from the console, not `firebase deploy`.
  - **1.6** No automated rules tests (`@firebase/rules-unit-testing` needs the emulator). The four scenarios become manual owner checks (see the Phase 1 handoff). `firebase-tools` was removed from devDependencies and `npm run emulators` / the `emulators` block in `firebase.json` were deleted.
  - **1.7** Only the console method for adding friends; no `npm run allow` script. Steps are in `docs/README.md` → "Adding friends".
- **Extra status `error`:** `useAuth().status` can also be `'error'` when the allowlist check itself fails (e.g. offline on first launch). `RequireAuth` then shows `AccessErrorPage` with **Try again** / **Sign out** instead of wrongly saying "not invited". `useAuth()` also exposes `retry()`.
- **Unverified email** → treated as `notAllowed` client-side (matches the rules' `email_verified` check).
- **Profile doc:** created once with `createdAt`; on later sign-ins `displayName`/`photoURL` are synced from Google if they changed. Email stored lowercase.
- **Sign-in:** popup with `prompt: select_account`; redirect only for an installed iOS PWA or when the popup is blocked (`auth/popup-blocked`, `operation-not-supported-in-environment`, `web-storage-unsupported`). Closing the popup is silent; other errors get a friendly toast.
- **Profile menu:** desktop = sidebar footer (avatar + name + email, opens upwards); mobile = new slim top bar in `AppLayout` (logo + avatar). `Menu` gained `header` and `up` props.
- **`/now-playing`** is guarded too (it sits outside `AppLayout` but inside `RequireAuth`).
- Files: `src/features/auth/` (`AuthProvider`, `AuthContext`, `useAuth`, `authApi`, `authHelpers`, `checkAccess`, `signIn`, `RequireAuth`, `LoginPage`, `NotInvitedPage`, `AccessErrorPage`, `ProfileMenu`, `UserAvatar`), `src/types/user.ts`, `src/components/FullScreenLoader.tsx`, `src/test/fakeAuth.tsx`.
