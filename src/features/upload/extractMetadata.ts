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

/** Reads duration via a temporary <audio> element when the parser couldn't. */
export function durationFromAudioElement(file: Blob): Promise<number> {
  return new Promise((resolve) => {
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
}

/** Reads tags from a file in the browser. Never throws: unreadable files get filename defaults. */
export async function extractMetadata(file: File): Promise<ExtractedMetadata> {
  try {
    const { parseBlob } = await import('music-metadata');
    const parsed = await parseBlob(file, { duration: true, skipCovers: false });
    const meta = metadataFromParsed(parsed, file.name);
    if (meta.durationSec === 0) meta.durationSec = await durationFromAudioElement(file);
    return meta;
  } catch {
    return {
      title: titleFromFileName(file.name),
      artist: UNKNOWN_ARTIST,
      album: null,
      durationSec: await durationFromAudioElement(file),
      cover: null,
    };
  }
}
