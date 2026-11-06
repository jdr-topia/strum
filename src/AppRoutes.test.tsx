import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from './AppRoutes';
import { ConfigErrorScreen } from '@/components/ConfigErrorScreen';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('app shell', () => {
  it.each([
    ['/', 'Home'],
    ['/library', 'Library'],
    ['/upload', 'Upload'],
    ['/search', 'Search'],
    ['/playlist/p1', 'Playlist'],
    ['/folder/f1', 'Folder'],
    ['/now-playing', 'Nothing playing'],
    ['/login', 'Strum'],
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
});

describe('ConfigErrorScreen', () => {
  it('lists the problems', () => {
    render(<ConfigErrorScreen problems={['VITE_FIREBASE_API_KEY is missing']} />);
    expect(screen.getByText('VITE_FIREBASE_API_KEY is missing')).toBeInTheDocument();
  });
});
