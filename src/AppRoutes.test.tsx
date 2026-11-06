import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppRoutes } from './AppRoutes';
import { ConfigErrorScreen } from '@/components/ConfigErrorScreen';
import type { AuthContextValue } from '@/features/auth/AuthContext';
import { FakeAuthProvider, fakeAuth } from '@/test/fakeAuth';

vi.mock('@/features/player/playerApi', () => ({
  loadLastQueue: () => Promise.resolve(null),
  saveLastQueue: () => Promise.resolve(),
}));

// Keeps Firebase out of this test: the library/upload pages read songs through songApi.
vi.mock('@/features/library/songApi', () => ({
  subscribeSongs: (_uid: string, _deleted: boolean, onNext: (songs: []) => void) => {
    onNext([]);
    return () => undefined;
  },
  addSong: () => Promise.resolve(''),
  updateSongInfo: () => Promise.resolve(),
  softDeleteSongs: () => Promise.resolve(),
  restoreSongs: () => Promise.resolve(),
  hardDeleteSongs: () => Promise.resolve(),
}));

// Playlists and folders: one fixture each so the playlist and folder routes have real headings.
vi.mock('@/features/playlists/playlistApi', () => ({
  subscribePlaylists: (_uid: string, onNext: (p: unknown[]) => void) => {
    onNext([
      {
        id: 'p1',
        name: 'Road trip',
        description: null,
        coverUrl: null,
        folderId: null,
        songIds: [],
        createdAt: null,
        updatedAt: null,
      },
    ]);
    return () => undefined;
  },
  addSongs: () => Promise.resolve(),
  createPlaylist: () => Promise.resolve(''),
  renamePlaylist: () => Promise.resolve(),
  setDescription: () => Promise.resolve(),
  removeSong: () => Promise.resolve(),
  reorderSongs: () => Promise.resolve(),
  movePlaylist: () => Promise.resolve(),
  deletePlaylist: () => Promise.resolve(),
  duplicatePlaylist: () => Promise.resolve(''),
}));

vi.mock('@/features/folders/folderApi', () => ({
  subscribeFolders: (_uid: string, onNext: (f: unknown[]) => void) => {
    onNext([{ id: 'f1', name: 'Workout', parentId: null, order: 0, createdAt: null }]);
    return () => undefined;
  },
  createFolder: () => Promise.resolve(''),
  renameFolder: () => Promise.resolve(),
  moveFolder: () => Promise.resolve(),
  reorderFolders: () => Promise.resolve(),
  deleteFolder: () => Promise.resolve(),
}));

function renderAt(path: string, auth: AuthContextValue = fakeAuth()) {
  return render(
    <FakeAuthProvider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </FakeAuthProvider>,
  );
}

describe('app shell (signed in)', () => {
  it.each([
    ['/', 'Home'],
    ['/library', 'Library'],
    ['/upload', 'Upload'],
    ['/search', 'Search'],
    ['/playlist/p1', 'Road trip'],
    ['/folder/f1', 'Workout'],
    ['/now-playing', 'Nothing playing'],
    ['/nope', 'Page not found'],
  ])('renders %s', (path, heading) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('navigates via the main nav', () => {
    renderAt('/');
    // Sidebar and tab bar both render in jsdom (visibility is CSS-only); use the first.
    fireEvent.click(screen.getAllByRole('link', { name: 'Library' })[0]);
    expect(screen.getByRole('heading', { level: 1, name: 'Library' })).toBeInTheDocument();
  });

  it('sends a signed-in user away from /login', () => {
    renderAt('/login');
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
  });
});

describe('route guard', () => {
  it('shows a loader while auth is loading', () => {
    renderAt('/library', fakeAuth({ status: 'loading', user: null }));
    expect(screen.getByRole('status')).toHaveTextContent('Signing you in');
  });

  it('redirects signed-out users to /login', () => {
    renderAt('/library', fakeAuth({ status: 'signedOut', user: null }));
    expect(screen.getByRole('heading', { level: 1, name: 'Strum' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('guards /now-playing too', () => {
    renderAt('/now-playing', fakeAuth({ status: 'signedOut', user: null }));
    expect(screen.getByRole('heading', { level: 1, name: 'Strum' })).toBeInTheDocument();
  });

  it('shows the not-invited screen for non-allowlisted users', () => {
    const auth = fakeAuth({ status: 'notAllowed' });
    renderAt('/', auth);
    expect(
      screen.getByRole('heading', { level: 1, name: "You're not on the list" }),
    ).toBeInTheDocument();
    expect(screen.getByText('asha@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('shows a retry screen when the access check failed', () => {
    const auth = fakeAuth({ status: 'error' });
    renderAt('/', auth);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(auth.retry).toHaveBeenCalled();
  });
});

describe('login page', () => {
  it('starts Google sign-in', () => {
    const auth = fakeAuth({ status: 'signedOut', user: null });
    renderAt('/login', auth);
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(auth.signIn).toHaveBeenCalled();
  });
});

describe('profile menu', () => {
  it('shows name, email and signs out', () => {
    const auth = fakeAuth();
    renderAt('/', auth);
    fireEvent.click(screen.getAllByRole('button', { name: 'Account' })[0]);
    const menu = screen.getByRole('menu');
    expect(menu).toHaveTextContent('Asha Test');
    expect(menu).toHaveTextContent('asha@example.com');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(auth.signOut).toHaveBeenCalled();
  });
});

describe('ConfigErrorScreen', () => {
  it('lists the problems', () => {
    render(<ConfigErrorScreen problems={['VITE_FIREBASE_API_KEY is missing']} />);
    expect(screen.getByText('VITE_FIREBASE_API_KEY is missing')).toBeInTheDocument();
  });
});
