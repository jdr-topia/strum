import type { PlaySource } from '@/types/player';
import type { Song } from '@/types/song';

const QUEUE_KEY = 'strum.player.queue';
const VOLUME_KEY = 'strum.player.volume';

export interface QueueSnapshot {
  songs: Song[];
  index: number;
  positionSec: number;
  source: PlaySource | null;
}

/** Saves the queue on this device. Storage can be blocked (private mode), so failures are ignored. */
export function saveLocalQueue(snapshot: QueueSnapshot): void {
  try {
    const plain = { ...snapshot, songs: snapshot.songs.map((s) => ({ ...s, createdAt: null })) };
    localStorage.setItem(QUEUE_KEY, JSON.stringify(plain));
  } catch {
    // Storage unavailable: resume-on-reload simply won't work on this device.
  }
}

export function loadLocalQueue(): QueueSnapshot | null {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QueueSnapshot>;
    if (!Array.isArray(parsed.songs) || parsed.songs.length === 0) return null;
    return {
      songs: parsed.songs as Song[],
      index: typeof parsed.index === 'number' ? parsed.index : 0,
      positionSec: typeof parsed.positionSec === 'number' ? parsed.positionSec : 0,
      source: parsed.source ?? null,
    };
  } catch {
    return null;
  }
}

export function clampVolume(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
}

export function loadVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    return raw === null ? 1 : clampVolume(Number(raw));
  } catch {
    return 1;
  }
}

export function saveVolume(volume: number): void {
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // Not persisted; the default volume applies next time.
  }
}
