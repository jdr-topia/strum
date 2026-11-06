# Phase 3 — Player

**Goal:** a reliable player with queue, shuffle, repeat, seeking, a persistent mini-player, a full now-playing view, and lock-screen/media-key controls.

---

## Design

The `<audio>` element lives **outside React** in a singleton `audioEngine`. The Zustand store is the source of truth for *what should* play; the engine reports *what is* playing. UI only reads the store, so route changes and re-renders never interrupt playback.

```
UI components ──actions──► playerStore (Zustand) ──commands──► audioEngine (HTMLAudioElement)
     ▲                            ▲                                   │
     └────────── state ───────────┴──────────── events ───────────────┘
                                       (timeupdate, ended, error, waiting, playing)
```

## Tasks

### 3.1 Audio engine
`src/features/player/audioEngine.ts`
- Single `new Audio()`, `preload = 'auto'`, `crossOrigin = 'anonymous'`.
- `load(url)`, `play()`, `pause()`, `seek(sec)`, `setVolume(v)`.
- Emits events to the store; throttles `timeupdate` to ~4 Hz.
- Handles `play()` promise rejection (autoplay policy) → sets `isPlaying=false` and shows "Tap to play".
- On `error`: retry once, then mark song unplayable and skip to next with a toast.
- **Preload next track:** a second hidden `Audio` element pre-fetches the next song's first bytes ~10 s before the current one ends for near-gapless transitions.

### 3.2 Player store
`src/features/player/playerStore.ts`
```ts
state: {
  queue: Song[]            // current play order
  originalQueue: Song[]    // pre-shuffle order
  index: number
  isPlaying: boolean
  isBuffering: boolean
  positionSec: number
  durationSec: number
  volume: number           // 0–1, persisted in localStorage
  muted: boolean
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
  source: { type: 'library' | 'playlist' | 'search', id?: string, name: string }
}
actions:
  playList(songs, startIndex, source)
  togglePlay(), next(), prev(), seek(sec)
  playNext(song), addToQueue(song), removeFromQueue(i), moveInQueue(from, to), clearQueue()
  toggleShuffle(), cycleRepeat(), setVolume(v), toggleMute()
```
Rules:
- `prev()` restarts the current song if position > 3 s, else goes to previous.
- Shuffle: Fisher–Yates on the remaining songs, current song stays first; turning off restores original order at the current song.
- Repeat one: replay on `ended`. Repeat all: wrap to 0. Off: stop at end of queue.

### 3.3 Resume where you left off
- Debounced (every 10 s and on `pagehide`) save of `{songIds, index, positionSec}` to `localStorage` and to `users/{uid}.lastQueue` (so it resumes across devices).
- On app load: restore queue paused at saved position.

### 3.4 Media Session API
- `navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album, artwork: [96, 256, 512 px Cloudinary cover URLs] })`.
- Action handlers: `play`, `pause`, `previoustrack`, `nexttrack`, `seekto`, `seekbackward`, `seekforward`.
- `setPositionState()` on time updates so the lock-screen scrubber is correct.
- Gives lock-screen controls on Android, media keys + OS overlay on desktop, Control Center on iOS.

### 3.5 Keyboard shortcuts (desktop)
`Space` play/pause · `←/→` seek ±10 s · `Shift+←/→` prev/next · `↑/↓` volume · `M` mute · `S` shuffle · `R` repeat. Ignored while typing in inputs.

### 3.6 UI components
- **MiniPlayer / PlayerBar** (always visible when a queue exists)
  - Desktop bar: cover, title/artist, prev / play-pause / next, shuffle, repeat, seek bar with times, volume slider, queue button.
  - Mobile mini: cover, title/artist, play-pause, thin progress line; tap opens Now Playing; swipe up also opens.
- **NowPlaying** (`/now-playing` on mobile, side panel on desktop): large cover, title/artist/album, seek bar, all controls, "Playing from <source>".
- **QueuePanel:** "Now playing", "Next up" list with drag reorder (`@dnd-kit`), remove, clear.
- **SeekBar:** pointer-drag with preview time, doesn't fight `timeupdate` while dragging; shows buffered range.
- Visual "now playing" indicator (animated bars) on the active row in any song list.
- Wire library row actions from Phase 2: Play, Play next, Add to queue. Double-click / tap a row = play library from that song.

### 3.7 Streaming URL
Use `streamUrl(publicId)` (128 kbps MP3 transcode, cached by Cloudinary after first request) unless decision #5 chose original. First play of a song may take slightly longer while Cloudinary transcodes.

---

## Acceptance criteria
- [ ] Play a song from the library; navigating between pages never interrupts audio.
- [ ] Next/prev/seek/shuffle/repeat behave as specified; queue reorder works.
- [ ] Lock-screen and headphone/media-key controls work on Android Chrome and desktop.
- [ ] Reload the page → queue and position restored (paused).
- [ ] A broken/missing file shows a toast and skips instead of freezing.
- [ ] Store logic (shuffle, repeat, prev rules, queue ops) covered by unit tests.

## You provide
- Nothing new. Testing on your phone(s) and reporting any lock-screen issues.
