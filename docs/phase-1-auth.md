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
Deployed with `npx firebase deploy --only firestore:rules`.

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
