import clsx from 'clsx';
import { Check, EllipsisVertical, ListEnd, ListPlus, Pencil, Play, Trash2 } from 'lucide-react';
import { Cover } from '@/components/Cover';
import { IconButton } from '@/components/IconButton';
import { Menu } from '@/components/Menu';
import { PlayingBars } from '@/features/player/PlayingBars';
import { formatDuration } from '@/lib/formatters';
import type { Song } from '@/types/song';

interface SongRowProps {
  song: Song;
  selectMode: boolean;
  selected: boolean;
  /** This is the song loaded in the player. */
  isCurrent: boolean;
  isPlaying: boolean;
  onToggleSelected: (id: string) => void;
  onPlay: () => void;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  onEdit: (song: Song) => void;
  onDelete: (song: Song) => void;
}

export function SongRow({
  song,
  selectMode,
  selected,
  isCurrent,
  isPlaying,
  onToggleSelected,
  onPlay,
  onPlayNext,
  onAddToQueue,
  onEdit,
  onDelete,
}: SongRowProps) {
  const subtitle = [song.artist, song.album].filter(Boolean).join(' · ');

  const body = (
    <>
      <div className="relative">
        <Cover src={song.coverUrl} seed={song.id} className="size-11" rounded="md" />
        {isCurrent && (
          <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50">
            <PlayingBars playing={isPlaying} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={clsx('truncate text-sm font-medium', isCurrent && 'text-accent')}>
          {song.title}
        </p>
        <p className="truncate text-xs text-muted">{subtitle || '—'}</p>
      </div>
      <span className="hidden text-xs text-muted tabular-nums sm:block">
        {formatDuration(song.durationSec)}
      </span>
    </>
  );

  return (
    <li
      className={clsx(
        'flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2',
        (selected || isCurrent) && 'bg-surface-2',
      )}
    >
      {selectMode ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select ${song.title}`}
          onClick={() => onToggleSelected(song.id)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            className={clsx(
              'flex size-5 shrink-0 items-center justify-center rounded border',
              selected ? 'border-accent bg-accent text-accent-fg' : 'border-muted',
            )}
          >
            {selected && <Check className="size-3.5" aria-hidden />}
          </span>
          {body}
        </button>
      ) : (
        <button
          type="button"
          onClick={onPlay}
          aria-label={`Play ${song.title}`}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {body}
        </button>
      )}

      {!selectMode && (
        <Menu
          align="end"
          trigger={({ toggle }) => (
            <IconButton
              label={`More options for ${song.title}`}
              icon={<EllipsisVertical className="size-5" />}
              size="sm"
              onClick={toggle}
              aria-haspopup="menu"
            />
          )}
          items={[
            { label: 'Play', icon: <Play />, onSelect: onPlay },
            { label: 'Play next', icon: <ListEnd />, onSelect: onPlayNext },
            { label: 'Add to queue', icon: <ListPlus />, onSelect: onAddToQueue },
            { label: 'Edit info', icon: <Pencil />, onSelect: () => onEdit(song) },
            { label: 'Delete', icon: <Trash2 />, danger: true, onSelect: () => onDelete(song) },
          ]}
        />
      )}
    </li>
  );
}
