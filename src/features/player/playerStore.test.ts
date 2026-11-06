import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '@/components/toastStore';
import type { Song } from '@/types/song';

const engine = vi.hoisted(() => ({
  listeners: [] as Array<(e: { type: string; positionSec?: number; durationSec?: number }) => void>,
  load: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  setMuted: vi.fn(),
  prefetch: vi.fn(),
  subscribe: vi.fn(),
}));

vi.mock('./audioEngine', () => {
  engine.subscribe.mockImplementation((l: (typeof engine.listeners)[number]) => {
    engine.listeners.push(l);
    return () => undefined;
  });
  return { audioEngine: engine };
});

vi.mock('@/config/cloudinary', () => ({
  streamUrl: (publicId: string) => `https://stream/${publicId}`,
}));

import { LIBRARY_SOURCE, usePlayerStore } from './playerStore';

const song = (id: string, durationSec = 200): Song =>
  ({
    id,
    title: `Song ${id}`,
    artist: 'Artist',
    album: null,
    durationSec,
    cloudinaryPublicId: `pid/${id}`,
    audioUrl: '',
    format: 'mp3',
    bytes: 1,
    coverPublicId: null,
    coverUrl: null,
    searchKeywords: [],
    deleted: false,
    createdAt: null,
  }) as Song;

const songs = ['a', 'b', 'c', 'd'].map((id) => song(id));
const store = () => usePlayerStore.getState();
const emit = (e: { type: string; positionSec?: number; durationSec?: number }) =>
  engine.listeners.forEach((l) => l(e));
const currentId = () => store().queue[store().index]?.id;

beforeEach(() => {
  vi.clearAllMocks();
  usePlayerStore.setState({
    queue: [],
    originalQueue: [],
    index: 0,
    isPlaying: false,
    positionSec: 0,
    durationSec: 0,
    shuffle: false,
    repeat: 'off',
    source: null,
  });
  useToastStore.setState({ toasts: [] });
});

describe('playList', () => {
  it('loads and plays the chosen song', () => {
    store().playList(songs, 2, LIBRARY_SOURCE);
    expect(currentId()).toBe('c');
    expect(engine.load).toHaveBeenLastCalledWith('https://stream/pid/c', 0);
    expect(engine.play).toHaveBeenCalled();
    expect(store().source).toEqual(LIBRARY_SOURCE);
  });

  it('ignores an empty list', () => {
    store().playList([], 0, LIBRARY_SOURCE);
    expect(store().queue).toHaveLength(0);
    expect(engine.load).not.toHaveBeenCalled();
  });
});

describe('next / prev', () => {
  it('next advances and stops at the end with repeat off', () => {
    store().playList(songs, 2, LIBRARY_SOURCE);
    store().next();
    expect(currentId()).toBe('d');
    store().next();
    expect(engine.pause).toHaveBeenCalled();
    expect(store().isPlaying).toBe(false);
    expect(currentId()).toBe('d');
  });

  it('next wraps around when repeat is all', () => {
    usePlayerStore.setState({ repeat: 'all' });
    store().playList(songs, 3, LIBRARY_SOURCE);
    store().next();
    expect(currentId()).toBe('a');
  });

  it('prev restarts a song that has played more than 3 seconds', () => {
    store().playList(songs, 1, LIBRARY_SOURCE);
    usePlayerStore.setState({ positionSec: 10 });
    store().prev();
    expect(engine.seek).toHaveBeenCalledWith(0);
    expect(currentId()).toBe('b');
  });

  it('prev goes back within the first 3 seconds', () => {
    store().playList(songs, 1, LIBRARY_SOURCE);
    store().playList(songs, 2, LIBRARY_SOURCE);
    usePlayerStore.setState({ positionSec: 1 });
    store().prev();
    expect(currentId()).toBe('b');
  });
});

describe('engine events', () => {
  it('repeat one replays the same song when it ends', () => {
    usePlayerStore.setState({ repeat: 'one' });
    store().playList(songs, 0, LIBRARY_SOURCE);
    vi.clearAllMocks();
    emit({ type: 'ended' });
    expect(engine.seek).toHaveBeenCalledWith(0);
    expect(engine.play).toHaveBeenCalled();
    expect(currentId()).toBe('a');
  });

  it('advances to the next song when one ends', () => {
    store().playList(songs, 0, LIBRARY_SOURCE);
    emit({ type: 'ended' });
    expect(currentId()).toBe('b');
  });

  it('stops after the last song when repeat is off', () => {
    store().playList(songs, 3, LIBRARY_SOURCE);
    emit({ type: 'ended' });
    expect(store().isPlaying).toBe(false);
  });

  it('marks playback blocked by the browser so the UI can ask for a tap', () => {
    store().playList(songs, 0, LIBRARY_SOURCE);
    emit({ type: 'blocked' });
    expect(store().needsTap).toBe(true);
    expect(store().isPlaying).toBe(false);
  });

  it('skips an unplayable song with a toast', () => {
    store().playList(songs, 0, LIBRARY_SOURCE);
    emit({ type: 'error' });
    expect(currentId()).toBe('b');
    expect(useToastStore.getState().toasts[0].message).toMatch(/Song a/);
  });

  it('prefetches the next song near the end', () => {
    store().playList(songs, 0, LIBRARY_SOURCE);
    emit({ type: 'time', positionSec: 195, durationSec: 200 });
    expect(engine.prefetch).toHaveBeenCalledWith('https://stream/pid/b');
  });
});

describe('shuffle', () => {
  it('keeps the current song first and restores order when turned off', () => {
    store().playList(songs, 2, LIBRARY_SOURCE);
    store().toggleShuffle();
    expect(store().queue[0].id).toBe('c');
    expect(store().index).toBe(0);
    expect(
      store()
        .queue.map((s) => s.id)
        .sort(),
    ).toEqual(['a', 'b', 'c', 'd']);

    store().toggleShuffle();
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(currentId()).toBe('c');
  });
});

describe('queue operations', () => {
  it('playNext inserts directly after the current song', () => {
    store().playList(songs.slice(0, 2), 0, LIBRARY_SOURCE);
    store().playNext(song('x'));
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'x', 'b']);
  });

  it('addToQueue appends to the end', () => {
    store().playList(songs.slice(0, 2), 0, LIBRARY_SOURCE);
    store().addToQueue(song('x'));
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'b', 'x']);
  });

  it('removes only upcoming songs', () => {
    store().playList(songs.slice(0, 3), 0, LIBRARY_SOURCE);
    store().removeFromQueue(0);
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    store().removeFromQueue(1);
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('moves upcoming songs and never ahead of the current one', () => {
    store().playList(songs, 0, LIBRARY_SOURCE);
    store().moveInQueue(3, 1);
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'd', 'b', 'c']);
    store().moveInQueue(2, 0);
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('clearQueue keeps the current song and what came before it', () => {
    store().playList(songs, 1, LIBRARY_SOURCE);
    store().clearQueue();
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'b']);
  });
});

describe('repeat and volume', () => {
  it('cycles repeat off → all → one → off', () => {
    store().cycleRepeat();
    expect(store().repeat).toBe('all');
    store().cycleRepeat();
    expect(store().repeat).toBe('one');
    store().cycleRepeat();
    expect(store().repeat).toBe('off');
  });

  it('clamps volume to 0–1 and passes it to the engine', () => {
    store().setVolume(1.7);
    expect(store().volume).toBe(1);
    expect(engine.setVolume).toHaveBeenLastCalledWith(1);
  });
});

describe('restore', () => {
  it('puts a saved queue back paused at its position', () => {
    store().restore({
      songs: songs.slice(0, 2),
      index: 1,
      positionSec: 42,
      source: LIBRARY_SOURCE,
    });
    expect(currentId()).toBe('b');
    expect(store().positionSec).toBe(42);
    expect(engine.load).toHaveBeenLastCalledWith('https://stream/pid/b', 42);
    expect(engine.play).not.toHaveBeenCalled();
  });
});
