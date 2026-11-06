import type { IAudioMetadata } from 'music-metadata';

export interface ExtractedMetadata {
  title: string;
  artist: string;
  album: string | null;
  /** 0 when unknown; the store then falls back to a temporary <audio> element. */
  durationSec: number;
  cover: Blob | null;
}

export const UNKNOWN_ARTIST = 'Unknown Artist';

/** Filename without its extension, used as the title when tags are missing. */
export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').trim();
  return base || 'Untitled';
}

/** Pure mapping from parsed tags to our fields, with defaults for missing tags. */
export function metadataFromParsed(
  parsed: Pick<IAudioMetadata, 'common' | 'format'>,
  fileName: string,
): ExtractedMetadata {
  const { common, format } = parsed;
  const picture = common.picture?.[0];
  const cover = picture ? new Blob([picture.data as BlobPart], { type: picture.format }) : null;
  const duration = format.duration;

  return {
    title: common.title?.trim() || titleFromFileName(fileName),
    artist: common.artist?.trim() || UNKNOWN_ARTIST,
    album: common.album?.trim() || null,
    durationSec: typeof duration === 'number' && Number.isFinite(duration) ? duration : 0,
    cover,
  };
}

/** Longest we wait for tags or duration before using filename defaults. Uploads never wait on this. */
export const READ_TIMEOUT_MS = 8000;

/** Resolves with `fallback` if `work` takes longer than `ms`. Never rejects. */
export function withTimeout<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([work.catch(() => fallback), timeout]).finally(() => clearTimeout(timer));
}

/** Reads duration via a temporary <audio> element when the parser couldn't. 0 on failure or timeout. */
export function durationFromAudioElement(file: Blob): Promise<number> {
  const read = new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) ? value : 0);
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(0);
    audio.src = url;
  });
  return withTimeout(read, READ_TIMEOUT_MS, 0);
}

function fallbackMetadata(file: File): ExtractedMetadata {
  return {
    title: titleFromFileName(file.name),
    artist: UNKNOWN_ARTIST,
    album: null,
    durationSec: 0,
    cover: null,
  };
}

/**
 * Reads tags from a file in the browser. Never throws, and never waits longer than
 * READ_TIMEOUT_MS per step: unreadable or slow files get filename defaults.
 */
export async function extractMetadata(file: File): Promise<ExtractedMetadata> {
  const parsed = await withTimeout(
    import('music-metadata').then(({ parseBlob }) =>
      parseBlob(file, { duration: true, skipCovers: false }),
    ),
    READ_TIMEOUT_MS,
    null,
  );
  if (!parsed) return fallbackMetadata(file);

  const meta = metadataFromParsed(parsed, file.name);
  if (meta.durationSec === 0) meta.durationSec = await durationFromAudioElement(file);
  return meta;
}
