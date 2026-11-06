import { describe, expect, it } from 'vitest';
import { gradientFor, hashString } from './gradient';

describe('gradientFor', () => {
  it('is stable for the same seed', () => {
    expect(gradientFor('song-1')).toBe(gradientFor('song-1'));
    expect(hashString('song-1')).toBe(hashString('song-1'));
  });

  it('differs between seeds', () => {
    expect(gradientFor('song-1')).not.toBe(gradientFor('song-2'));
  });

  it('returns a CSS linear-gradient', () => {
    expect(gradientFor('x')).toMatch(/^linear-gradient\(135deg, hsl\(\d+ /);
  });
});
