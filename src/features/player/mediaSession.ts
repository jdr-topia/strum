import { coverUrl } from '@/config/cloudinary';
import type { Song } from '@/types/song';

/** Actions the OS (lock screen, headphones, media keys) can trigger. */
export interface MediaActions {
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (sec: number) => void;
  seekBy: (deltaSec: number) => void;
}

const SKIP_SEC = 10;
const ARTWORK_SIZES = [96, 256, 512];

function session(): MediaSession | null {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
    ? navigator.mediaSession
    : null;
}

/** Wires lock-screen / media-key buttons. Silently does nothing where unsupported. */
export function initMediaSession(actions: MediaActions): void {
  const ms = session();
  if (!ms) return;

  const handle = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
    try {
      ms.setActionHandler(action, handler);
    } catch {
      // This browser doesn't support the action; the others still work.
    }
  };

  handle('play', () => actions.play());
  handle('pause', () => actions.pause());
  handle('previoustrack', () => actions.prev());
  handle('nexttrack', () => actions.next());
  handle('seekto', (d) => {
    if (d.seekTime != null) actions.seekTo(d.seekTime);
  });
  handle('seekbackward', (d) => actions.seekBy(-(d.seekOffset ?? SKIP_SEC)));
  handle('seekforward', (d) => actions.seekBy(d.seekOffset ?? SKIP_SEC));
}

let lastSongId: string | null = null;

/** Keeps the OS now-playing card in sync. Metadata is only rebuilt when the song changes. */
export function updateMediaSession(
  song: Song | null,
  playing: boolean,
  positionSec: number,
  durationSec: number,
): void {
  const ms = session();
  if (!ms) return;

  const songId = song?.id ?? null;
  if (songId !== lastSongId) {
    lastSongId = songId;
    ms.metadata =
      song && typeof MediaMetadata !== 'undefined'
        ? new MediaMetadata({
            title: song.title,
            artist: song.artist,
            album: song.album ?? '',
            artwork: song.coverPublicId
              ? ARTWORK_SIZES.map((px) => ({
                  src: coverUrl(song.coverPublicId as string, px),
                  sizes: `${px}x${px}`,
                }))
              : [],
          })
        : null;
  }

  ms.playbackState = song ? (playing ? 'playing' : 'paused') : 'none';

  if (song && durationSec > 0 && Number.isFinite(positionSec)) {
    try {
      ms.setPositionState({
        duration: durationSec,
        playbackRate: 1,
        position: Math.min(Math.max(0, positionSec), durationSec),
      });
    } catch {
      // Some browsers reject position state for live/invalid values; ignore.
    }
  }
}
