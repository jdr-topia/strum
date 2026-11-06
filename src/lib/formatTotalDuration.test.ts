import { describe, expect, it } from 'vitest';
import { formatTotalDuration } from './formatters';

describe('formatTotalDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatTotalDuration(2700)).toBe('45 min');
    expect(formatTotalDuration(7500)).toBe('2 hr 5 min');
    expect(formatTotalDuration(7200)).toBe('2 hr');
    expect(formatTotalDuration(-1)).toBe('—');
  });
});
