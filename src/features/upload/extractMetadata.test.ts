import { describe, expect, it } from 'vitest';
import { metadataFromParsed, titleFromFileName, UNKNOWN_ARTIST } from './extractMetadata';

// Only the fields metadataFromParsed reads; cast keeps the test small.
type Parsed = Parameters<typeof metadataFromParsed>[0];

describe('metadataFromParsed', () => {
  it('uses ID3 tags when present', () => {
    const parsed = {
      common: { title: ' Halo ', artist: 'Beyonce', album: 'I Am', picture: undefined },
      format: { duration: 215.4 },
    } as unknown as Parsed;

    expect(metadataFromParsed(parsed, '01 Halo.mp3')).toEqual({
      title: 'Halo',
      artist: 'Beyonce',
      album: 'I Am',
      durationSec: 215.4,
      cover: null,
    });
  });

  it('falls back to filename and "Unknown Artist" when tags are empty', () => {
    const parsed = { common: {}, format: {} } as unknown as Parsed;
    const meta = metadataFromParsed(parsed, 'my-song.m4a');
    expect(meta.title).toBe('my-song');
    expect(meta.artist).toBe(UNKNOWN_ARTIST);
    expect(meta.album).toBeNull();
    expect(meta.durationSec).toBe(0);
  });

  it('turns embedded picture data into a Blob with its MIME type', () => {
    const parsed = {
      common: { picture: [{ format: 'image/jpeg', data: new Uint8Array([1, 2, 3]) }] },
      format: {},
    } as unknown as Parsed;
    const { cover } = metadataFromParsed(parsed, 'x.mp3');
    expect(cover).toBeInstanceOf(Blob);
    expect(cover?.type).toBe('image/jpeg');
    expect(cover?.size).toBe(3);
  });
});

describe('titleFromFileName', () => {
  it('strips only the final extension', () => {
    expect(titleFromFileName('Track.Part.2.mp3')).toBe('Track.Part.2');
  });
});
