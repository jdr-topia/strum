/**
 * The only place that touches an <audio> element for playback. Lives outside React.
 * The player store tells it what to do (load/play/seek…) and listens to what it reports.
 */

export type EngineEvent =
  | { type: 'time'; positionSec: number; durationSec: number }
  | {
      type: 'playing' | 'paused' | 'waiting' | 'canplay' | 'ended' | 'error' | 'blocked';
    };

type Listener = (event: EngineEvent) => void;

/** timeupdate fires ~4 times a second; we forward at most this often. */
const TIME_EVENT_INTERVAL_MS = 250;

class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private prefetchEl: HTMLAudioElement | null = null;
  private listeners = new Set<Listener>();
  private retried = false;
  private pendingStart = 0;
  private lastTimeEmit = 0;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Starts loading `url`; playback begins only when play() is called. */
  load(url: string, startAt = 0): void {
    this.retried = false;
    this.pendingStart = startAt;
    const el = this.el();
    el.src = url;
    el.load();
  }

  play(): void {
    const p = this.el().play();
    // Autoplay policy: the browser needs a user gesture first. Tell the UI to show "Tap to play".
    p?.catch((err: unknown) => {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        this.emit({ type: 'blocked' });
      }
      // Other failures (e.g. AbortError when the source changes) are handled via the error event.
    });
  }

  pause(): void {
    this.audio?.pause();
  }

  seek(sec: number): void {
    if (this.audio) this.audio.currentTime = Math.max(0, sec);
  }

  setVolume(volume: number): void {
    this.el().volume = Math.min(1, Math.max(0, volume));
  }

  setMuted(muted: boolean): void {
    this.el().muted = muted;
  }

  /**
   * Warms the browser cache for the next song so the switch is near-gapless.
   * Uses a separate element; playback still goes through the main element.
   */
  prefetch(url: string): void {
    if (!this.prefetchEl) {
      this.prefetchEl = new Audio();
      this.prefetchEl.preload = 'auto';
    }
    if (this.prefetchEl.src !== url) {
      this.prefetchEl.src = url;
      this.prefetchEl.load();
    }
  }

  private emit(event: EngineEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  private el(): HTMLAudioElement {
    if (!this.audio) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      this.bind(audio);
      this.audio = audio;
    }
    return this.audio;
  }

  private bind(audio: HTMLAudioElement): void {
    audio.addEventListener('timeupdate', () => {
      const now = performance.now();
      if (now - this.lastTimeEmit < TIME_EVENT_INTERVAL_MS) return;
      this.lastTimeEmit = now;
      this.emit({
        type: 'time',
        positionSec: audio.currentTime,
        durationSec: Number.isFinite(audio.duration) ? audio.duration : 0,
      });
    });

    audio.addEventListener('loadedmetadata', () => {
      if (this.pendingStart > 0) {
        audio.currentTime = this.pendingStart;
        this.pendingStart = 0;
      }
    });

    audio.addEventListener('playing', () => this.emit({ type: 'playing' }));
    audio.addEventListener('waiting', () => this.emit({ type: 'waiting' }));
    audio.addEventListener('canplay', () => this.emit({ type: 'canplay' }));
    audio.addEventListener('pause', () => {
      // Reaching the end also fires pause; the "ended" event covers that case.
      if (!audio.ended) this.emit({ type: 'paused' });
    });
    audio.addEventListener('ended', () => this.emit({ type: 'ended' }));

    audio.addEventListener('error', () => {
      // One retry for flaky networks, then give up and let the store skip the song.
      if (!this.retried && audio.src) {
        this.retried = true;
        audio.load();
        return;
      }
      this.emit({ type: 'error' });
    });
  }
}

export const audioEngine = new AudioEngine();
