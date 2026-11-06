import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Cover } from '@/components/Cover';
import { IconButton } from '@/components/IconButton';

/** Mobile (<md) mini-player above the tab bar. Placeholder until Phase 3. */
export function MiniPlayer() {
  return (
    <div className="fixed inset-x-2 bottom-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+0.5rem)] z-30 flex h-14 items-center gap-3 rounded-lg bg-surface-2 px-2 shadow-lg md:hidden">
      <Link to="/now-playing" className="flex min-w-0 flex-1 items-center gap-3">
        <Cover seed="nothing-playing" className="size-10" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Nothing playing</p>
          <p className="truncate text-xs text-muted">Tap a song to start</p>
        </div>
      </Link>
      <IconButton label="Play" icon={<Play className="size-5" />} disabled />
    </div>
  );
}
