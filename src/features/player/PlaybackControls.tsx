import clsx from 'clsx';
import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import { IconButton } from '@/components/IconButton';
import { usePlayerStore } from './playerStore';

interface PlaybackControlsProps {
  /** `lg` is for the full-screen player. */
  size?: 'md' | 'lg';
}

export function PlaybackControls({ size = 'md' }: PlaybackControlsProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const hasSong = usePlayerStore((s) => s.queue.length > 0);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const { togglePlay, next, prev, toggleShuffle, cycleRepeat } = usePlayerStore.getState();

  const big = size === 'lg';
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  const repeatLabel =
    repeat === 'off' ? 'Repeat off' : repeat === 'all' ? 'Repeat all' : 'Repeat one';

  return (
    <div className="flex items-center justify-center gap-2">
      <IconButton
        label={shuffle ? 'Shuffle on' : 'Shuffle off'}
        aria-pressed={shuffle}
        size="sm"
        className={clsx(shuffle && 'text-accent')}
        icon={<Shuffle className="size-4" />}
        onClick={toggleShuffle}
        disabled={!hasSong}
      />
      <IconButton
        label="Previous"
        size={big ? 'lg' : 'md'}
        icon={<SkipBack className={big ? 'size-7' : 'size-5'} />}
        onClick={prev}
        disabled={!hasSong}
      />
      <IconButton
        label={isPlaying ? 'Pause' : 'Play'}
        size={big ? 'lg' : 'md'}
        className={clsx(
          'bg-fg text-bg hover:bg-zinc-200 hover:text-bg',
          big ? 'size-16' : 'size-10',
        )}
        icon={
          isPlaying ? (
            <Pause className={big ? 'size-7' : 'size-5'} />
          ) : (
            <Play className={clsx(big ? 'size-7' : 'size-5', 'translate-x-px')} />
          )
        }
        onClick={togglePlay}
        disabled={!hasSong}
      />
      <IconButton
        label="Next"
        size={big ? 'lg' : 'md'}
        icon={<SkipForward className={big ? 'size-7' : 'size-5'} />}
        onClick={next}
        disabled={!hasSong}
      />
      <IconButton
        label={repeatLabel}
        size="sm"
        className={clsx(repeat !== 'off' && 'text-accent')}
        icon={<RepeatIcon className="size-4" />}
        onClick={cycleRepeat}
        disabled={!hasSong}
      />
    </div>
  );
}
