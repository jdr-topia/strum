import { describe, expect, it } from 'vitest';
import { encodeContext, friendlyUploadError } from './cloudinaryUpload';

describe('encodeContext', () => {
  it('joins pairs with | and strips reserved characters', () => {
    expect(encodeContext({ title: 'A|B=C', artist: 'Me' })).toBe('title=A B C|artist=Me');
  });

  it('drops empty values', () => {
    expect(encodeContext({ title: 'X', artist: '  ' })).toBe('title=X');
  });
});

describe('friendlyUploadError', () => {
  it('explains network failures', () => {
    expect(friendlyUploadError(0)).toMatch(/Network problem/);
  });

  it('explains oversize files with the limit', () => {
    expect(friendlyUploadError(400, 'File size too large', 50)).toBe(
      'That file is too large. The limit is 50 MB.',
    );
  });

  it('explains unsupported formats', () => {
    expect(friendlyUploadError(400, 'Invalid extension in transformation')).toMatch(
      /isn't supported/,
    );
  });

  it('falls back to a generic message', () => {
    expect(friendlyUploadError(500)).toMatch(/Cloudinary is having trouble/);
  });
});
