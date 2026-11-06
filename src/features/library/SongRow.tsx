import clsx from 'clsx';
import {
  Check,
  EllipsisVertical,
  Globe,
  ListEnd,
  ListMusic,
  ListPlus,
  ListX,
  Lock,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react';
import type { CSSProperties, ReactNode, Ref } from 'react';
import { Cover } from '@/components/Cover';
import { IconButton } from '@/components/IconButton';
import { Menu, type MenuItem } from '@/components/Menu';
import { PlayingBars } from '@/features/player/PlayingBars';
import { formatDuration } from '@/lib/formatters';
import type { Song } from '@/types/song';

export interface SongRowProps {
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
  /** Edit and delete are left out for songs the user doesn't own (Discover). */
  onEdit?: (song: Song) => void;
  onDelete?: (song: Song) => void;
  /** Adds "Make public" / "Make private" to the row menu (own songs only). */
  onTogglePublic?: () => void;
  /** Extra line after the artist, e.g. "Shared by Rahul" in Discover. */
  byline?: string;
  /** Adds "Add to playlist" to the row menu. */
  onAddToPlaylist?: () => void;
  /** Adds "Remove from playlist" to the row menu (playlist page only). */
  onRemoveFromPlaylist?: () => void;
  /** Shown before the cover, e.g. a drag handle on the playlist page. */
  dragHandle?: ReactNode;
  rowRef?: Ref<HTMLLIElement>;
  rowStyle?: CSSProperties;
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
  onTogglePublic,
  byline,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  dragHandle,
  rowRef,
  rowStyle,
}: SongRowProps) {
  const subtitle = [song.artist, song.album, byline].filter(Boolean).join(' · ');
  // The globe marks the user's own shared songs; Discover rows are all public, so it's skipped.
  const showPublicMark = song.isPublic && !song.owner;

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
        <p
          className={clsx(
            'flex items-center gap-1.5 text-sm font-medium',
            isCurrent && 'text-accent',
          )}
        >
          <span className="truncate">{song.title}</span>
          {showPublicMark && (
            <Globe className="size-3.5 shrink-0 text-muted" aria-label="Public" role="img" />
          )}
        </p>
        <p className="truncate text-xs text-muted">{subtitle || '—'}</p>
      </div>
      <span className="hidden text-xs text-muted tabular-nums sm:block">
        {formatDuration(song.durationSec)}
      </span>
    </>
  );

  const items: MenuItem[] = [
    { label: 'Play', icon: <Play />, onSelect: onPlay },
    { label: 'Play next', icon: <ListEnd />, onSelect: onPlayNext },
    { label: 'Add to queue', icon: <ListPlus />, onSelect: onAddToQueue },
    ...(onAddToPlaylist
      ? [{ label: 'Add to playlist', icon: <ListMusic />, onSelect: onAddToPlaylist }]
      : []),
    ...(onRemoveFromPlaylist
      ? [{ label: 'Remove from playlist', icon: <ListX />, onSelect: onRemoveFromPlaylist }]
      : []),
    ...(onTogglePublic
      ? [
          song.isPublic
            ? { label: 'Make private', icon: <Lock />, onSelect: onTogglePublic }
            : { label: 'Make public', icon: <Globe />, onSelect: onTogglePublic },
        ]
      : []),
    ...(onEdit ? [{ label: 'Edit info', icon: <Pencil />, onSelect: () => onEdit(song) }] : []),
    ...(onDelete
      ? [{ label: 'Delete', icon: <Trash2 />, danger: true, onSelect: () => onDelete(song) }]
      : []),
  ];

  return (
    <li
      ref={rowRef}
      style={rowStyle}
      className={clsx(
        'flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2',
        (selected || isCurrent) && 'bg-surface-2',
      )}
    >
      {dragHandle}

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
          items={items}
        />
      )}
    </li>
  );
}
