# Handoff — Phase 3 — Player

**Date:** 2026-11-06
**Phase doc:** docs/phase-3-player.md
**Status:** Complete with deferrals
**Last commit:** see `git log -1` (commit "phase-3: add handoff")

## What was built
- `src/features/player/audioEngine.ts` — the only `<audio>` owner. Single element (`preload=auto`, `crossOrigin=anonymous`), `load/play/pause/seek/setVolume/setMuted`, `timeupdate` throttled to 250 ms, `NotAllowedError` → `blocked` event (autoplay), one automatic retry then `error`. `prefetch(url)` warms the browser cache for the next song via a second element.
- `src/features/player/playerStore.ts` (Zustand) — source of truth for queue, index, play state, position, volume (persisted), shuffle, repeat, source, queue-panel open state. Actions: `playList`, `play/pause/togglePlay`, `next/prev/seek`, `playNext`, `addToQueue`, `removeFromQueue`, `moveInQueue`, `clearQueue`, `toggleShuffle`, `cycleRepeat`, `setVolume`, `toggleMute`, `restore`. Rules implemented as in the phase doc (prev restarts after 3 s; shuffle keeps current first and restores order when off; repeat one replays on end, all wraps, off stops). Unplayable songs are skipped with a toast; stops if every song in the queue fails in a row.
- `src/features/player/queueLogic.ts` — pure rules (shuffle, next index, prev target, move) with tests.
- `src/features/player/mediaSession.ts` — lock-screen/media-key handlers (play, pause, previous/next track, seek to/back/forward) and metadata with Cloudinary cover art at 96/256/512 px; position state updated on change.
- `src/features/player/usePlayerLifecycle.ts` — mounted in `AppLayout`. Restores the queue once the library has loaded (paused, at the saved position): this device first (`localStorage`), else cross-device `users/{uid}.lastQueue`. Saves every 10 s while something changes, on `pagehide` and when the tab is hidden. Saved songs are resolved against the live library, so songs deleted since are dropped.
- `src/features/player/usePlayerKeyboard.ts` — Space, ←/→ (±10 s), Shift+←/→ (prev/next), ↑/↓ (volume), M, S, R; ignored inside text fields.
- UI: `PlayerBar.tsx` (desktop footer: cover + title, controls + seek bar, volume, queue toggle), `MiniPlayer.tsx` (mobile, progress line, tap → `/now-playing`), `NowPlayingPage.tsx` (full screen, "Playing from …", queue button), `SeekBar.tsx` (drag commits on release; keyboard commits immediately), `PlaybackControls.tsx`, `QueuePanel.tsx` (bottom sheet on mobile, right panel on desktop; "Next up" drag reorder via `@dnd-kit/sortable`, remove, clear), `QueueRow.tsx`, `PlayingBars.tsx`.
- Library (`src/features/library/`): row body tap plays the library from that song; row menu has Play, Play next, Add to queue, Edit info, Delete. The row of the loaded song shows an animated indicator.
- `src/types/player.ts` (`PlaySource`, `RepeatMode`), `src/features/player/playerApi.ts` (the only Firestore access for the player: `users/{uid}.lastQueue`), `src/features/player/playerPersistence.ts` (local queue + volume, storage errors ignored).
- No Firestore rules change (`users/{uid}` already allows the owner to write it).
- Tests added: `queueLogic.test.ts`, `playerStore.test.ts` (engine mocked: playback, next/prev rules, repeat, events, prefetch, shuffle, queue operations, volume, restore). Total: **116 passing** with the Phase 2 tests.

## Acceptance criteria
- [x] Store logic (shuffle, repeat, prev rules, queue ops) covered by unit tests — `queueLogic.test.ts`, `playerStore.test.ts`.
- [ ] Play a song from the library; navigating between pages never interrupts audio — needs owner verification (the `<audio>` element is outside React; not run in a browser here, sign-in needs your account).
- [ ] Next/prev/seek/shuffle/repeat behave as specified; queue reorder works — rules are unit-tested; the UI needs owner verification.
- [ ] Lock-screen and headphone/media-key controls work on Android Chrome and desktop — needs owner verification on devices.
- [ ] Reload the page → queue and position restored (paused) — needs owner verification (logic implemented in `usePlayerLifecycle.ts`).
- [ ] A broken/missing file shows a toast and skips instead of freezing — store behaviour tested with a mocked engine; needs a real broken file to confirm.

## Deviations from plan
- **Desktop queue**: a fixed right-hand panel that opens from the player bar, not a permanent side panel.
- **Prefetch** warms the browser cache with a second `<audio>` element. It does not guarantee a gapless switch; the audio element still loads the next song itself. Real gapless playback would need Web Audio decoding — not done.
- **Seek bar** has no buffered-range display (deferred).
- **Swipe-up** on the mini-player to open Now Playing is not implemented; tapping it works.
- **Reorder vs shuffle**: drag-reordering while shuffle is on changes the shuffled order only; turning shuffle off restores the original order (the drag is lost). Turning it on, then off, is the expected behaviour in the spec.
- **Source types**: `PlaySource` supports `playlist` and `search`, but only the library is wired (Phase 4 / Phase 4 search).
- **Queue persistence** keeps the queue order and position but not shuffle or repeat state.
- Cross-device `lastQueue` is written at most every 10 s, and only when the state changed. This is about 6 writes/min while a device plays.

## Deferred / known issues
- Add to playlist — Phase 4 (playlists).
- Playlist and search sources in the player — Phase 4.
- Audio engine has no unit test (it wraps `HTMLAudioElement`); covered by owner device testing.
- Cloudinary delivers streams with CORS headers only if the account allows it. If `crossOrigin="anonymous"` fails on the owner's device, the first play will hit the error path (toast + skip). Check on first run; the fix is to drop `crossOrigin` in `audioEngine.ts`.
- Phase 2 items still open: create the composite index on `songs` (see handoff 03).

## Owner action needed
- Create the Firestore composite index on `songs` (deleted ASC, createdAt DESC) if not yet done (handoff 03).
- Restore `.env.example` (still deleted in the working tree; not staged by this phase).
- Test on a phone and desktop: play from the library, navigate pages during playback, lock-screen controls, reload → queue restored paused, a broken file skips with a toast.

## How to run
- `npm install`
- `npm run dev` — http://localhost:5173 (needs `.env.local`)
- `npm run lint` · `npm run build` · `npm run test` (116 tests)

## Next phase
- **Phase 4 — Playlists, Folders & Search**, `docs/phase-4-playlists-folders.md`.
- Wire the "Add to playlist" row action (the library menu is ready for it).
- `PlaySource` already has `playlist` and `search` types; pass them to `playList(...)` from the playlist and search pages.
- Playlist membership removal on song delete is already in `softDeleteSongs` (`src/features/library/songApi.ts`).

## Continuation prompt
```text
You are continuing the Strum project in this repository.

1. Read AGENTS.md and follow it.
2. Read docs/README.md.
3. Read the latest handoff: docs/handoffs/04-phase-3-player.md
4. Implement Phase 4 — Playlists, Folders & Search as described in docs/phase-4-playlists-folders.md.

Before coding, confirm the repo state matches the handoff and list any owner actions from the handoff that are still pending. When the phase is complete, follow the "Definition of done" in AGENTS.md: write the next handoff file, commit, and give me the next continuation prompt.
```
