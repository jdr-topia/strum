import { Pause, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Cover } from '@/components/Cover';
import { IconButton } from '@/components/IconButton';
import { usePlayerStore } from './playerStore';

/** Mobile (<md) mini-player above the tab bar. Tap it to open Now Playing. */
export function MiniPlayer() {
  const song = usePlayerStore((s) => s.queue[s.index] ?? null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const needsTap = usePlayerStore((s) => s.needsTap);
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const { togglePlay } = usePlayerStore.getState();

  if (!song) return null;
  const progress = durationSec > 0 ? Math.min(100, (positionSec / durationSec) * 100) : 0;

  return (
    <div className="fixed inset-x-2 bottom-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+0.5rem)] z-30 overflow-hidden rounded-lg bg-surface-2 shadow-lg md:hidden">
      <div className="h-0.5 bg-surface" aria-hidden>
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex h-14 items-center gap-3 px-2">
        <Link to="/now-playing" className="flex min-w-0 flex-1 items-center gap-3">
          <Cover src={song.coverUrl} seed={song.id} className="size-10" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{song.title}</p>
            <p className="truncate text-xs text-muted">
              {needsTap ? 'Tap play to start' : song.artist}
            </p>
          </div>
        </Link>
        <IconButton
          label={isPlaying ? 'Pause' : 'Play'}
          icon={isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
          onClick={togglePlay}
        />
      </div>
    </div>
  );
}
