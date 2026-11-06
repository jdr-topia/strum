import { describe, expect, it } from 'vitest';
import { coverUrl, streamUrl, UPLOAD_URL, type CloudinaryConfig } from './cloudinary';

const config: CloudinaryConfig = {
  cloudName: 'demo',
  uploadPreset: 'strum_unsigned',
  streamQuality: '128k',
};

describe('cloudinary helpers', () => {
  it('builds upload URLs per resource type', () => {
    expect(UPLOAD_URL('video', config)).toBe('https://api.cloudinary.com/v1_1/demo/video/upload');
    expect(UPLOAD_URL('image', config)).toBe('https://api.cloudinary.com/v1_1/demo/image/upload');
  });

  it('streams a 128k mp3 transcode by default', () => {
    expect(streamUrl('strum/songs/u1/abc', config)).toBe(
      'https://res.cloudinary.com/demo/video/upload/br_128k,f_mp3/strum/songs/u1/abc.mp3',
    );
  });

  it('streams the original when configured', () => {
    expect(streamUrl('strum/songs/u1/abc', { ...config, streamQuality: 'original' })).toBe(
      'https://res.cloudinary.com/demo/video/upload/strum/songs/u1/abc',
    );
  });

  it('builds square cover URLs', () => {
    expect(coverUrl('strum/covers/u1/c', 300.4, config)).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_fill,w_300,h_300,f_auto,q_auto/strum/covers/u1/c',
    );
  });
});
