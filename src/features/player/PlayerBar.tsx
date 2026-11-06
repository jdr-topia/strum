import { Play, SkipBack, SkipForward } from 'lucide-react';
import { Cover } from '@/components/Cover';
import { IconButton } from '@/components/IconButton';

/** Desktop (md+) bottom player bar. Placeholder until Phase 3 wires the audio engine. */
export function PlayerBar() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 hidden h-player items-center gap-4 border-t border-border bg-surface px-4 md:flex">
      <div className="flex w-1/3 min-w-0 items-center gap-3">
        <Cover seed="nothing-playing" className="size-12" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Nothing playing</p>
          <p className="truncate text-xs text-muted">Pick a song from your library</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center gap-2">
        <IconButton label="Previous" icon={<SkipBack className="size-5" />} disabled />
        <IconButton
          label="Play"
          icon={<Play className="size-5" />}
          className="bg-fg text-bg hover:bg-zinc-200 hover:text-bg"
          disabled
        />
        <IconButton label="Next" icon={<SkipForward className="size-5" />} disabled />
      </div>
      <div className="w-1/3" />
    </footer>
  );
}
