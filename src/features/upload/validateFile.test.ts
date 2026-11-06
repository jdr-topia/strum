import { describe, expect, it } from 'vitest';
import { validateAudioFile } from './validateFile';

const MB = 1024 * 1024;

describe('validateAudioFile', () => {
  it('accepts audio MIME types', () => {
    expect(validateAudioFile({ name: 'a.bin', type: 'audio/mpeg', size: MB }, 50)).toBeNull();
  });

  it('accepts known extensions when the MIME type is empty', () => {
    expect(validateAudioFile({ name: 'Song.M4A', type: '', size: MB }, 50)).toBeNull();
  });

  it('rejects non-audio files with a clear message', () => {
    expect(validateAudioFile({ name: 'cover.png', type: 'image/png', size: 10 }, 50)).toMatch(
      /isn't an audio file/,
    );
  });

  it('rejects files over the size limit', () => {
    expect(validateAudioFile({ name: 'big.mp3', type: 'audio/mpeg', size: 51 * MB }, 50)).toMatch(
      /larger than 50 MB/,
    );
  });
});
