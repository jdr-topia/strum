import { ListMusic, Volume2, VolumeX } from 'lucide-react';
import { Cover } from '@/components/Cover';
import { IconButton } from '@/components/IconButton';
import { PlaybackControls } from './PlaybackControls';
import { SeekBar } from './SeekBar';
import { usePlayerStore } from './playerStore';

/** Desktop (md+) player bar along the bottom of the window. */
export function PlayerBar() {
  const song = usePlayerStore((s) => s.queue[s.index] ?? null);
  const needsTap = usePlayerStore((s) => s.needsTap);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const queueOpen = usePlayerStore((s) => s.queueOpen);
  const { setVolume, toggleMute, setQueueOpen } = usePlayerStore.getState();

  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 hidden h-player grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center gap-4 border-t border-border bg-surface px-4 md:grid">
      <div className="flex min-w-0 items-center gap-3">
        <Cover src={song?.coverUrl} seed={song?.id ?? 'nothing-playing'} className="size-12" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{song?.title ?? 'Nothing playing'}</p>
          <p className="truncate text-xs text-muted">
            {needsTap ? 'Press play to start' : (song?.artist ?? 'Pick a song from your library')}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <PlaybackControls />
        <SeekBar />
      </div>

      <div className="flex items-center justify-end gap-2">
        <IconButton
          label={muted ? 'Unmute' : 'Mute'}
          size="sm"
          icon={muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          onClick={toggleMute}
        />
        <input
          type="range"
          aria-label="Volume"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="h-1 w-24 accent-accent"
        />
        <IconButton
          label={queueOpen ? 'Hide queue' : 'Show queue'}
          aria-pressed={queueOpen}
          size="sm"
          className={queueOpen ? 'text-accent' : undefined}
          icon={<ListMusic className="size-4" />}
          onClick={() => setQueueOpen(!queueOpen)}
        />
      </div>
    </footer>
  );
}
