import { create } from 'zustand';
import { toast } from '@/components/toastStore';
import { streamUrl } from '@/config/cloudinary';
import type { PlaySource, RepeatMode } from '@/types/player';
import type { Song } from '@/types/song';
import { audioEngine, type EngineEvent } from './audioEngine';
import { loadVolume, saveVolume, type QueueSnapshot } from './playerPersistence';
import { initMediaSession, updateMediaSession } from './mediaSession';
import { moveItem, nextIndex, prevTarget, shuffleAround } from './queueLogic';

/** Start prefetching the next song this many seconds before the current one ends. */
const PRELOAD_BEFORE_END_SEC = 10;
export const LIBRARY_SOURCE: PlaySource = { type: 'library', name: 'Library' };

export interface PlayerState {
  /** Current play order. `queue[index]` is the song that is loaded. */
  queue: Song[];
  /** Order before shuffle; restored when shuffle is turned off. */
  originalQueue: Song[];
  index: number;

  isPlaying: boolean;
  isBuffering: boolean;
  /** Browser blocked autoplay; the UI should show "Tap to play". */
  needsTap: boolean;
  positionSec: number;
  durationSec: number;

  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  source: PlaySource | null;
  queueOpen: boolean;

  playList: (songs: Song[], startIndex: number, source: PlaySource) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;

  playNext: (song: Song) => void;
  addToQueue: (song: Song) => void;
  /** Only songs after the current one can be removed or moved. */
  removeFromQueue: (index: number) => void;
  moveInQueue: (from: number, to: number) => void;
  clearQueue: () => void;

  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setQueueOpen: (open: boolean) => void;

  /** Puts a saved queue back in place, paused at the saved position. */
  restore: (snapshot: QueueSnapshot) => void;
}

// ---- internals (module scope so engine callbacks can reach the store) -----------------

const get = () => usePlayerStore.getState();
const set = (partial: Partial<PlayerState>) => usePlayerStore.setState(partial);
const currentSong = (s: PlayerState = get()): Song | null => s.queue[s.index] ?? null;

let consecutiveFailures = 0;
let prefetchedId: string | null = null;

function loadCurrent(startAt: number, autoplay: boolean): void {
  const song = currentSong();
  if (!song) return;
  set({
    positionSec: startAt,
    durationSec: song.durationSec,
    isBuffering: true,
    needsTap: false,
    isPlaying: autoplay,
  });
  audioEngine.load(streamUrl(song.cloudinaryPublicId), startAt);
  if (autoplay) audioEngine.play();
}

function goTo(index: number): void {
  set({ index });
  loadCurrent(0, true);
}

/** Manual "next" wraps unless repeat is off; natural song ends follow the repeat setting. */
function nextFor(manual: boolean): number | null {
  const s = get();
  const repeat: RepeatMode = manual && s.repeat !== 'off' ? 'all' : s.repeat;
  return nextIndex(s.index, s.queue.length, repeat);
}

function maybePrefetch(remainingSec: number): void {
  if (!Number.isFinite(remainingSec) || remainingSec > PRELOAD_BEFORE_END_SEC) return;
  const s = get();
  if (s.repeat === 'one') return;
  const upNext = s.queue[s.index + 1] ?? (s.repeat === 'all' ? s.queue[0] : undefined);
  if (!upNext || upNext.id === prefetchedId) return;
  prefetchedId = upNext.id;
  audioEngine.prefetch(streamUrl(upNext.cloudinaryPublicId));
}

function handleEnded(): void {
  const s = get();
  if (s.repeat === 'one') {
    audioEngine.seek(0);
    set({ positionSec: 0 });
    audioEngine.play();
    return;
  }
  const n = nextIndex(s.index, s.queue.length, s.repeat);
  if (n === null) {
    set({ isPlaying: false, positionSec: s.durationSec });
    return;
  }
  goTo(n);
}

/** A song that can't be played is skipped; stops if every song in the queue fails in a row. */
function failCurrent(): void {
  const song = currentSong();
  consecutiveFailures++;
  if (song) toast.error(`Couldn't play "${song.title}". Skipping it.`);
  const n = nextIndex(get().index, get().queue.length, get().repeat);
  if (n === null || consecutiveFailures >= get().queue.length) {
    consecutiveFailures = 0;
    audioEngine.pause();
    set({ isPlaying: false, isBuffering: false });
    return;
  }
  goTo(n);
}

function handleEngineEvent(e: EngineEvent): void {
  switch (e.type) {
    case 'time':
      maybePrefetch(e.durationSec - e.positionSec);
      set({
        positionSec: e.positionSec,
        durationSec: e.durationSec > 0 ? e.durationSec : get().durationSec,
      });
      break;
    case 'playing':
      consecutiveFailures = 0;
      set({ isPlaying: true, isBuffering: false, needsTap: false });
      break;
    case 'paused':
      set({ isPlaying: false });
      break;
    case 'waiting':
      set({ isBuffering: true });
      break;
    case 'canplay':
      set({ isBuffering: false });
      break;
    case 'blocked':
      set({ isPlaying: false, isBuffering: false, needsTap: true });
      break;
    case 'ended':
      handleEnded();
      break;
    case 'error':
      failCurrent();
      break;
  }
}

const REPEAT_CYCLE: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' };

// ---- store ----------------------------------------------------------------------------

export const usePlayerStore = create<PlayerState>(() => ({
  queue: [],
  originalQueue: [],
  index: 0,
  isPlaying: false,
  isBuffering: false,
  needsTap: false,
  positionSec: 0,
  durationSec: 0,
  volume: loadVolume(),
  muted: false,
  shuffle: false,
  repeat: 'off',
  source: null,
  queueOpen: false,

  playList: (songs, startIndex, source) => {
    if (songs.length === 0) return;
    const start = Math.min(Math.max(0, startIndex), songs.length - 1);
    const s = get();
    const queue = s.shuffle ? shuffleAround(songs, songs[start].id) : [...songs];
    set({
      queue,
      originalQueue: [...songs],
      index: s.shuffle ? 0 : start,
      source,
    });
    loadCurrent(0, true);
  },

  play: () => {
    if (!currentSong()) return;
    set({ isPlaying: true, needsTap: false });
    audioEngine.play();
  },

  pause: () => {
    audioEngine.pause();
    set({ isPlaying: false });
  },

  togglePlay: () => {
    if (get().isPlaying) get().pause();
    else get().play();
  },

  next: () => {
    const n = nextFor(true);
    if (n === null) {
      audioEngine.pause();
      set({ isPlaying: false });
      return;
    }
    goTo(n);
  },

  prev: () => {
    const s = get();
    const target = prevTarget(s.positionSec, s.index);
    if (target.action === 'restart') get().seek(0);
    else goTo(target.index);
  },

  seek: (sec) => {
    const d = get().durationSec;
    const target = Math.min(Math.max(0, sec), d > 0 ? d : Number.POSITIVE_INFINITY);
    audioEngine.seek(target);
    set({ positionSec: target });
  },

  playNext: (song) => {
    const s = get();
    if (s.queue.length === 0) {
      get().playList([song], 0, LIBRARY_SOURCE);
      return;
    }
    const cur = s.queue[s.index];
    const queue = [...s.queue];
    queue.splice(s.index + 1, 0, song);
    const original = [...s.originalQueue];
    const oi = original.indexOf(cur);
    original.splice(oi < 0 ? original.length : oi + 1, 0, song);
    set({ queue, originalQueue: original });
  },

  addToQueue: (song) => {
    const s = get();
    if (s.queue.length === 0) {
      get().playList([song], 0, LIBRARY_SOURCE);
      return;
    }
    set({ queue: [...s.queue, song], originalQueue: [...s.originalQueue, song] });
  },

  removeFromQueue: (i) => {
    const s = get();
    if (i <= s.index || i >= s.queue.length) return;
    const song = s.queue[i];
    const queue = s.queue.filter((_, k) => k !== i);
    const oi = s.originalQueue.indexOf(song);
    const original = oi < 0 ? s.originalQueue : s.originalQueue.filter((_, k) => k !== oi);
    set({ queue, originalQueue: original });
  },

  moveInQueue: (from, to) => {
    const s = get();
    if (from <= s.index || from >= s.queue.length) return;
    const target = Math.min(Math.max(to, s.index + 1), s.queue.length - 1);
    if (target === from) return;
    const queue = moveItem(s.queue, from, target);
    // While shuffled, the original order is kept so turning shuffle off still works.
    set({ queue, originalQueue: s.shuffle ? s.originalQueue : [...queue] });
  },

  clearQueue: () => {
    const s = get();
    const cur = currentSong(s);
    if (!cur) return;
    const oi = s.originalQueue.indexOf(cur);
    set({
      queue: s.queue.slice(0, s.index + 1),
      originalQueue: oi < 0 ? [cur] : s.originalQueue.slice(0, oi + 1),
    });
  },

  toggleShuffle: () => {
    const s = get();
    const cur = currentSong(s);
    if (!s.shuffle) {
      set({
        shuffle: true,
        queue: cur ? shuffleAround(s.originalQueue, cur.id) : s.queue,
        index: 0,
      });
      return;
    }
    const oi = cur ? Math.max(0, s.originalQueue.indexOf(cur)) : 0;
    set({ shuffle: false, queue: [...s.originalQueue], index: oi });
  },

  cycleRepeat: () => set({ repeat: REPEAT_CYCLE[get().repeat] }),

  setVolume: (volume) => {
    const clamped = Math.min(1, Math.max(0, volume));
    audioEngine.setVolume(clamped);
    saveVolume(clamped);
    set({ volume: clamped });
  },

  toggleMute: () => {
    const muted = !get().muted;
    audioEngine.setMuted(muted);
    set({ muted });
  },

  setQueueOpen: (open) => set({ queueOpen: open }),

  restore: (snapshot) => {
    if (snapshot.songs.length === 0) return;
    const index = Math.min(Math.max(0, snapshot.index), snapshot.songs.length - 1);
    const songs = [...snapshot.songs];
    set({
      queue: songs,
      originalQueue: [...songs],
      index,
      source: snapshot.source,
      positionSec: snapshot.positionSec,
      durationSec: songs[index].durationSec,
      isPlaying: false,
      needsTap: false,
    });
    // Paused: the user decides when to resume.
    loadCurrent(snapshot.positionSec, false);
  },
}));

// ---- wiring ---------------------------------------------------------------------------

audioEngine.subscribe(handleEngineEvent);
audioEngine.setVolume(usePlayerStore.getState().volume);

initMediaSession({
  play: () => get().play(),
  pause: () => get().pause(),
  next: () => get().next(),
  prev: () => get().prev(),
  seekTo: (sec) => get().seek(sec),
  seekBy: (delta) => get().seek(get().positionSec + delta),
});

let lastMediaKey = '';
usePlayerStore.subscribe((s) => {
  const song = s.queue[s.index] ?? null;
  const key = `${song?.id ?? ''}|${s.isPlaying}|${Math.floor(s.positionSec)}|${s.durationSec}`;
  if (key === lastMediaKey) return;
  lastMediaKey = key;
  updateMediaSession(song, s.isPlaying, s.positionSec, s.durationSec);
});
