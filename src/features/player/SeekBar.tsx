import { useRef, useState } from 'react';
import { formatDuration } from '@/lib/formatters';
import { usePlayerStore } from './playerStore';

/**
 * Scrub bar. While the user drags, the value follows the finger and the audio isn't moved
 * until release, so playback doesn't stutter. Keyboard arrows seek immediately.
 */
export function SeekBar() {
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const seek = usePlayerStore((s) => s.seek);
  const hasSong = usePlayerStore((s) => s.queue.length > 0);

  const [dragValue, setDragValue] = useState<number | null>(null);
  const dragging = useRef(false);

  const max = durationSec > 0 ? durationSec : 0;
  const shown = Math.min(dragValue ?? positionSec, max || positionSec);

  return (
    <div className="flex w-full items-center gap-3 text-xs text-muted tabular-nums">
      <span className="w-10 text-right">{formatDuration(shown)}</span>
      <input
        type="range"
        aria-label="Seek"
        min={0}
        max={max}
        step={0.1}
        value={shown}
        disabled={!hasSong || max === 0}
        onPointerDown={() => {
          dragging.current = true;
        }}
        onChange={(e) => {
          const value = Number(e.target.value);
          if (dragging.current) {
            setDragValue(value);
          } else {
            seek(value); // keyboard or assistive tech: commit straight away
          }
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          if (dragValue !== null) {
            seek(Number((e.target as HTMLInputElement).value));
            setDragValue(null);
          }
        }}
        onPointerCancel={() => {
          dragging.current = false;
          setDragValue(null);
        }}
        className="h-1 min-w-0 flex-1 cursor-pointer accent-accent disabled:cursor-default"
      />
      <span className="w-10">{formatDuration(max)}</span>
    </div>
  );
}
