import { useSortable } from '@dnd-kit/sortable';
import { GripVertical, X } from 'lucide-react';
import { Cover } from '@/components/Cover';
import { IconButton } from '@/components/IconButton';
import type { Song } from '@/types/song';

interface QueueRowProps {
  id: string;
  song: Song;
  onRemove: () => void;
}

/** One "Next up" row. Drag the grip to reorder. */
export function QueueRow({ id, song, onRemove }: QueueRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
      }}
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${isDragging ? 'bg-surface-2 opacity-80' : ''}`}
    >
      <button
        type="button"
        aria-label={`Reorder ${song.title}`}
        className="cursor-grab touch-none p-1 text-muted hover:text-fg"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <Cover src={song.coverUrl} seed={song.id} className="size-9" rounded="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{song.title}</p>
        <p className="truncate text-xs text-muted">{song.artist}</p>
      </div>
      <IconButton
        label={`Remove ${song.title} from queue`}
        icon={<X className="size-4" />}
        size="sm"
        onClick={onRemove}
      />
    </li>
  );
}
