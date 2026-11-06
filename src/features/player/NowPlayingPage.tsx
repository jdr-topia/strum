import { ChevronDown, ListMusic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Cover } from '@/components/Cover';
import { IconButton } from '@/components/IconButton';
import { PlaybackControls } from './PlaybackControls';
import { SeekBar } from './SeekBar';
import { usePlayerStore } from './playerStore';

/** Full-screen player (mobile). Desktop uses the player bar and queue panel instead. */
export function NowPlayingPage() {
  const navigate = useNavigate();
  const song = usePlayerStore((s) => s.queue[s.index] ?? null);
  const source = usePlayerStore((s) => s.source);
  const needsTap = usePlayerStore((s) => s.needsTap);
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen);

  return (
    <main className="flex min-h-dvh flex-col gap-6 px-6 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <div className="flex items-center justify-between">
        <IconButton
          label="Close player"
          icon={<ChevronDown className="size-6" />}
          onClick={() => navigate(-1)}
        />
        <p className="text-xs font-semibold tracking-wider text-muted uppercase">
          {source ? `Playing from ${source.name}` : 'Now playing'}
        </p>
        <IconButton
          label="Show queue"
          icon={<ListMusic className="size-5" />}
          onClick={() => setQueueOpen(true)}
        />
      </div>

      <Cover
        src={song?.coverUrl}
        seed={song?.id ?? 'nothing-playing'}
        rounded="md"
        className="mx-auto w-full max-w-sm"
      />

      <div className="min-w-0">
        {song ? (
          <>
            <h1 className="truncate text-xl font-bold">{song.title}</h1>
            <p className="truncate text-sm text-muted">
              {needsTap
                ? 'Tap play to start'
                : [song.artist, song.album].filter(Boolean).join(' · ')}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">Nothing playing</h1>
            <p className="text-sm text-muted">Pick a song from your library</p>
          </>
        )}
      </div>

      <div className="mt-auto space-y-6">
        <SeekBar />
        <PlaybackControls size="lg" />
      </div>
    </main>
  );
}
