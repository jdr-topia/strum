import { describe, expect, it } from 'vitest';
import { parseEnv, REQUIRED_ENV_VARS, type RawEnv } from './env';

const complete: RawEnv = {
  VITE_FIREBASE_API_KEY: 'key',
  VITE_FIREBASE_AUTH_DOMAIN: 'strum.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'strum',
  VITE_FIREBASE_STORAGE_BUCKET: 'strum.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
  VITE_CLOUDINARY_CLOUD_NAME: 'demo',
  VITE_CLOUDINARY_UPLOAD_PRESET: 'strum_unsigned',
};

describe('parseEnv', () => {
  it('accepts a complete env and applies defaults', () => {
    const result = parseEnv(complete);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.env.firebase.projectId).toBe('strum');
    expect(result.env.cloudinary).toEqual({ cloudName: 'demo', uploadPreset: 'strum_unsigned' });
    expect(result.env.maxUploadMb).toBe(50);
    expect(result.env.streamQuality).toBe('128k');
  });

  it('lists every missing required var', () => {
    const result = parseEnv({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toHaveLength(REQUIRED_ENV_VARS.length);
    expect(result.problems[0]).toContain('VITE_FIREBASE_API_KEY');
  });

  it('treats blank values as missing', () => {
    const result = parseEnv({ ...complete, VITE_CLOUDINARY_CLOUD_NAME: '   ' });
    expect(result).toEqual({ ok: false, problems: ['VITE_CLOUDINARY_CLOUD_NAME is missing'] });
  });

  it('reads optional values', () => {
    const result = parseEnv({
      ...complete,
      VITE_MAX_UPLOAD_MB: '80',
      VITE_STREAM_QUALITY: 'original',
    });
    expect(result.ok && result.env.maxUploadMb).toBe(80);
    expect(result.ok && result.env.streamQuality).toBe('original');
  });

  it('rejects invalid optional values', () => {
    const result = parseEnv({ ...complete, VITE_MAX_UPLOAD_MB: '500', VITE_STREAM_QUALITY: 'hi' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toHaveLength(2);
  });
});
