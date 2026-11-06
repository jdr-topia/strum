import { describe, expect, it } from 'vitest';
import { withTimeout } from './extractMetadata';

describe('withTimeout', () => {
  it('returns the work result when it finishes in time', async () => {
    await expect(withTimeout(Promise.resolve(3), 50, 0)).resolves.toBe(3);
  });

  it('returns the fallback when the work is too slow', async () => {
    const slow = new Promise<number>((resolve) => setTimeout(() => resolve(3), 200));
    await expect(withTimeout(slow, 10, -1)).resolves.toBe(-1);
  });

  it('returns the fallback when the work fails', async () => {
    await expect(withTimeout(Promise.reject(new Error('x')), 50, 'fallback')).resolves.toBe(
      'fallback',
    );
  });
});
