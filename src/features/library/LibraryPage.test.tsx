import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeAuthProvider, fakeAuth } from '@/test/fakeAuth';
import type { Song } from '@/types/song';
import { LibraryPage } from './LibraryPage';

const { softDeleteSongs, sampleSongs } = vi.hoisted(() => {
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
      createdAt: null,
    }) as Song;
  return {
    softDeleteSongs: vi.fn(() => Promise.resolve()),
    sampleSongs: [make('s1', 'Halo', 'Beyonce'), make('s2', 'Crazy', 'Gnarls Barkley')],
  };
});

// Keeps Firebase out of the test; the page only needs the live list and the delete call.
vi.mock('./songApi', () => ({
  subscribeSongs: (_uid: string, _deleted: boolean, onNext: (songs: Song[]) => void) => {
    onNext(sampleSongs);
    return () => undefined;
  },
  softDeleteSongs,
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
});
