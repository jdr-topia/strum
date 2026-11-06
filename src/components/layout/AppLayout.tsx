import { Outlet } from 'react-router-dom';
import { MiniPlayer } from '@/features/player/MiniPlayer';
import { PlayerBar } from '@/features/player/PlayerBar';
import { BottomTabBar } from './BottomTabBar';
import { Sidebar } from './Sidebar';

/**
 * Desktop: sidebar | main, with a player bar along the bottom.
 * Mobile: main, with a mini-player floating above the bottom tab bar.
 */
export function AppLayout() {
  return (
    <div className="flex h-dvh">
      <div className="flex min-h-0 flex-1 md:pb-player">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+4.5rem)] md:pb-0">
          <Outlet />
        </main>
      </div>
      <PlayerBar />
      <MiniPlayer />
      <BottomTabBar />
    </div>
  );
}
