import { ChevronDown, Play, SkipBack, SkipForward } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Cover } from '@/components/Cover';
import { IconButton } from '@/components/IconButton';

/** Full-screen player (mainly mobile). Placeholder until Phase 3. */
export function NowPlayingPage() {
  const navigate = useNavigate();
  return (
    <main className="flex min-h-dvh flex-col gap-6 px-6 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
      <div className="flex items-center justify-between">
        <IconButton
          label="Close player"
          icon={<ChevronDown className="size-6" />}
          onClick={() => navigate(-1)}
        />
        <p className="text-xs font-semibold tracking-wider text-muted uppercase">Now playing</p>
        <span className="size-10" />
      </div>
      <Cover seed="nothing-playing" rounded="md" className="mx-auto w-full max-w-sm" />
      <div>
        <h1 className="text-xl font-bold">Nothing playing</h1>
        <p className="text-sm text-muted">Pick a song from your library</p>
      </div>
      <div className="mt-auto flex items-center justify-center gap-6">
        <IconButton label="Previous" size="lg" icon={<SkipBack className="size-6" />} disabled />
        <IconButton
          label="Play"
          icon={<Play className="size-7" />}
          className="size-16 bg-fg text-bg"
          disabled
        />
        <IconButton label="Next" size="lg" icon={<SkipForward className="size-6" />} disabled />
      </div>
    </main>
  );
}
