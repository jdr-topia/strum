import { describe, expect, it } from 'vitest';
import { formatBytes, formatDuration } from './formatters';

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(215.4)).toBe('3:35');
    expect(formatDuration(59)).toBe('0:59');
  });

  it('adds hours when needed', () => {
    expect(formatDuration(3723)).toBe('1:02:03');
  });

  it('shows a dash for invalid values', () => {
    expect(formatDuration(NaN)).toBe('—');
    expect(formatDuration(-1)).toBe('—');
  });
});

describe('formatBytes', () => {
  it('picks a readable unit', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(4_500_000)).toBe('4.3 MB');
  });
});
