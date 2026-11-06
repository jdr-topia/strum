import { describe, expect, it } from 'vitest';
import { buildSearchKeywords, normalizeText } from './keywords';

describe('normalizeText', () => {
  it('lowercases, strips diacritics and punctuation', () => {
    expect(normalizeText('Beyoncé — "Halo" (Live!)')).toBe('beyonce halo live');
  });
});

describe('buildSearchKeywords', () => {
  it('includes whole words and prefixes of at least 2 chars', () => {
    const keys = buildSearchKeywords('Halo', 'Beyoncé');
    expect(keys).toEqual(expect.arrayContaining(['halo', 'ha', 'hal', 'beyonce', 'be', 'bey']));
    expect(keys).not.toContain('h');
  });

  it('skips empty and null fields and dedupes', () => {
    expect(buildSearchKeywords(null, undefined, '', 'Ab Ab')).toEqual(['ab']);
  });

  it('caps the list at 50 entries', () => {
    const long = Array.from(
      { length: 40 },
      (_, i) => `word${String.fromCharCode(97 + (i % 26))}x${i}`,
    ).join(' ');
    expect(buildSearchKeywords(long).length).toBeLessThanOrEqual(50);
  });
});
