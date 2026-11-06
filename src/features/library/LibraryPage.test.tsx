import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeAuthProvider, fakeAuth } from '@/test/fakeAuth';
import type { Song } from '@/types/song';
import { LibraryPage } from './LibraryPage';

const { softDeleteSongs, setSongsPublic, sampleSongs } = vi.hoisted(() => {
  const make = (id: string, title: string, artist: string): Song =>
    ({
      id,
      title,
      artist,
      album: null,
      durationSec: 180,
      cloudinaryPublicId: `strum/songs/u1/${id}`,
      audioUrl: `https://res.cloudinary.com/demo/video/upload/${id}.mp3`,
      format: 'mp3',
      bytes: 1000,
      coverPublicId: null,
      coverUrl: null,
      searchKeywords: [],
      deleted: false,
      isPublic: false,
      createdAt: null,
    }) as Song;
  return {
    softDeleteSongs: vi.fn(() => Promise.resolve()),
    setSongsPublic: vi.fn(() => Promise.resolve()),
    sampleSongs: [make('s1', 'Halo', 'Beyonce'), make('s2', 'Crazy', 'Gnarls Barkley')],
  };
});

// Playlists and folders are not used by these tests; empty lists keep Firebase out of them.
vi.mock('@/features/playlists/playlistApi', () => ({
  subscribePlaylists: (_uid: string, onNext: (p: unknown[]) => void) => {
    onNext([]);
    return () => undefined;
  },
  addSongs: () => Promise.resolve(),
  createPlaylist: () => Promise.resolve(''),
}));

vi.mock('@/features/folders/folderApi', () => ({
  subscribeFolders: (_uid: string, onNext: (f: unknown[]) => void) => {
    onNext([]);
    return () => undefined;
  },
}));

// Discover (friends' public songs): none, so Firebase stays out of this test.
vi.mock('@/features/discover/publicSongApi', () => ({
  subscribePublicSongs: (onNext: (songs: []) => void) => {
    onNext([]);
    return () => undefined;
  },
}));

// Keeps Firebase out of the test; the page only needs the live list and the delete call.
vi.mock('./songApi', () => ({
  subscribeSongs: (_uid: string, _deleted: boolean, onNext: (songs: Song[]) => void) => {
    onNext(sampleSongs);
    return () => undefined;
  },
  softDeleteSongs,
  setSongsPublic,
  restoreSongs: () => Promise.resolve(),
}));

function renderLibrary() {
  return render(
    <FakeAuthProvider value={fakeAuth()}>
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    </FakeAuthProvider>,
  );
}

describe('LibraryPage', () => {
  beforeEach(() => {
    softDeleteSongs.mockClear();
    setSongsPublic.mockClear();
  });

  it('lists songs and filters them by text', () => {
    renderLibrary();
    expect(screen.getByText('Halo')).toBeInTheDocument();
    expect(screen.getByText('Crazy')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: /filter songs/i }), {
      target: { value: 'halo' },
    });
    expect(screen.queryByText('Crazy')).not.toBeInTheDocument();
    expect(screen.getByText('Halo')).toBeInTheDocument();
  });

  it('soft-deletes a song from its row menu', async () => {
    renderLibrary();
    fireEvent.click(screen.getByRole('button', { name: 'More options for Halo' }));
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Delete' }));

    await waitFor(() => expect(softDeleteSongs).toHaveBeenCalledWith('u1', ['s1']));
  });

  it('makes a song public from its row menu, with the display name as owner', async () => {
    renderLibrary();
    fireEvent.click(screen.getByRole('button', { name: 'More options for Halo' }));
    fireEvent.click(
      within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Make public' }),
    );

    await waitFor(() =>
      expect(setSongsPublic).toHaveBeenCalledWith(
        { uid: 'u1', name: 'Asha Test' },
        [sampleSongs[0]],
        true,
      ),
    );
  });

  it('makes selected songs public in select mode', async () => {
    renderLibrary();
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Halo' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Crazy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Make public' }));

    await waitFor(() => expect(setSongsPublic).toHaveBeenCalledTimes(1));
    const [, songs, isPublic] = setSongsPublic.mock.calls[0] as unknown as [
      unknown,
      Song[],
      boolean,
    ];
    expect(songs.map((s) => s.id).sort()).toEqual(['s1', 's2']);
    expect(isPublic).toBe(true);
  });
});
