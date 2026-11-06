import { AudioLines } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { ProfileMenu } from '@/features/auth/ProfileMenu';
import { MiniPlayer } from '@/features/player/MiniPlayer';
import { PlayerBar } from '@/features/player/PlayerBar';
import { BottomTabBar } from './BottomTabBar';
import { Sidebar } from './Sidebar';

/**
 * Desktop: sidebar | main, with a player bar along the bottom.
 * Mobile: slim top bar (logo + account), main, and a mini-player above the bottom tab bar.
 */
export function AppLayout() {
  return (
    <div className="flex h-dvh">
      <div className="flex min-h-0 flex-1 md:pb-player">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border px-4 pt-[env(safe-area-inset-top)] md:hidden">
            <span className="flex h-12 items-center gap-2 font-bold">
              <AudioLines className="size-5 text-accent" aria-hidden />
              Strum
            </span>
            <ProfileMenu />
          </header>
          <main className="min-w-0 flex-1 overflow-y-auto pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+4.5rem)] md:pb-0">
            <Outlet />
          </main>
        </div>
      </div>
      <PlayerBar />
      <MiniPlayer />
      <BottomTabBar />
    </div>
  );
}
