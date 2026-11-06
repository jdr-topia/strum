import clsx from 'clsx';

const BARS = [
  { height: '60%', delay: '0ms' },
  { height: '100%', delay: '150ms' },
  { height: '40%', delay: '300ms' },
];

/** Small animated equaliser shown on the row of the song that's loaded. */
export function PlayingBars({ playing }: { playing: boolean }) {
  return (
    <span
      role="img"
      aria-label={playing ? 'Playing' : 'Paused'}
      className="flex h-4 w-4 shrink-0 items-end justify-center gap-0.5"
    >
      {BARS.map((bar, i) => (
        <span
          key={i}
          className={clsx('w-1 rounded-sm bg-accent', playing && 'animate-pulse')}
          style={{ height: bar.height, animationDelay: bar.delay }}
        />
      ))}
    </span>
  );
}
