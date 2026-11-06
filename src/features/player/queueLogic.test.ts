import { describe, expect, it } from 'vitest';
import { moveItem, nextIndex, prevTarget, shuffleAround, shuffleArray } from './queueLogic';

// Deterministic "random": always picks the last slot, so the result is predictable.
const lastSlot = () => 0.999999;

describe('shuffleArray', () => {
  it('returns a permutation and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffleArray(input, () => 0.5);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('shuffleAround', () => {
  it('keeps the current song first and shuffles the rest', () => {
    const songs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const out = shuffleAround(songs, 'b', lastSlot);
    expect(out[0].id).toBe('b');
    expect(out.map((s) => s.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('shuffles everything when the current song is unknown', () => {
    const songs = [{ id: 'a' }, { id: 'b' }];
    expect(shuffleAround(songs, undefined, () => 0)).toHaveLength(2);
  });
});

describe('nextIndex', () => {
  it('advances within the queue', () => {
    expect(nextIndex(0, 3, 'off')).toBe(1);
  });

  it('stops at the end with repeat off', () => {
    expect(nextIndex(2, 3, 'off')).toBeNull();
  });

  it('wraps to the start with repeat all', () => {
    expect(nextIndex(2, 3, 'all')).toBe(0);
  });

  it('returns null for an empty queue', () => {
    expect(nextIndex(0, 0, 'all')).toBeNull();
  });
});

describe('prevTarget', () => {
  it('restarts when more than 3 seconds in', () => {
    expect(prevTarget(10, 2)).toEqual({ action: 'restart' });
  });

  it('goes to the previous song within the first 3 seconds', () => {
    expect(prevTarget(1, 2)).toEqual({ action: 'goto', index: 1 });
  });

  it('restarts the first song instead of going back', () => {
    expect(prevTarget(1, 0)).toEqual({ action: 'restart' });
  });
});

describe('moveItem', () => {
  it('moves an item to a new position', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });
});
