import { describe, expect, it } from 'vitest';
import type { Song } from '@/types/song';
import { findDuplicate } from './duplicates';

const song = (over: Partial<Song>): Song =>
  ({
    id: 's1',
    title: 'Halo',
    artist: 'Beyoncé',
    durationSec: 200,
    ...over,
  }) as Song;

describe('findDuplicate', () => {
  it('matches case/diacritic-insensitive title and artist within 2 seconds', () => {
    const songs = [song({ title: 'HALO', artist: 'Beyonce', durationSec: 201.5 })];
    expect(findDuplicate({ title: 'Halo', artist: 'Beyoncé', durationSec: 200 }, songs)?.id).toBe(
      's1',
    );
  });

  it('does not match when the duration differs by more than 2 seconds', () => {
    const songs = [song({ durationSec: 210 })];
    expect(
      findDuplicate({ title: 'Halo', artist: 'Beyoncé', durationSec: 200 }, songs),
    ).toBeUndefined();
  });

  it('does not match a different artist', () => {
    const songs = [song({ artist: 'Someone else' })];
    expect(
      findDuplicate({ title: 'Halo', artist: 'Beyoncé', durationSec: 200 }, songs),
    ).toBeUndefined();
  });
});
