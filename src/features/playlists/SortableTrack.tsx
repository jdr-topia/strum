import { useSortable } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import { SongRow, type SongRowProps } from '@/features/library/SongRow';

type TrackProps = Omit<SongRowProps, 'dragHandle' | 'rowRef' | 'rowStyle'> & {
  /** Only the custom order can be dragged; other sorts are view-only. */
  sortable: boolean;
};

/** One playlist track that can be dragged to reorder (drag handle on the left). */
export function SortableTrack({ sortable, ...rowProps }: TrackProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rowProps.song.id,
    disabled: !sortable,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  const handle = sortable ? (
    <button
      type="button"
      aria-label={`Drag ${rowProps.song.title} to reorder`}
      className="touch-none rounded p-1 text-muted hover:text-fg"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  ) : null;

  return <SongRow {...rowProps} rowRef={setNodeRef} rowStyle={style} dragHandle={handle} />;
}
