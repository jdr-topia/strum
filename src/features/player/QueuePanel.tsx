import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { X } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/Button';
import { Cover } from '@/components/Cover';
import { IconButton } from '@/components/IconButton';
import { QueueRow } from './QueueRow';
import { usePlayerStore } from './playerStore';

/**
 * Current song plus "Next up". Mobile: bottom sheet. Desktop: right-hand panel.
 * Only songs after the current one can be reordered or removed.
 */
export function QueuePanel() {
  const open = usePlayerStore((s) => s.queueOpen);
  const queue = usePlayerStore((s) => s.queue);
  const index = usePlayerStore((s) => s.index);
  const source = usePlayerStore((s) => s.source);
  const { setQueueOpen, moveInQueue, removeFromQueue, clearQueue } = usePlayerStore.getState();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Row ids encode the absolute queue position, so duplicates of the same song stay distinct.
  const upcoming = useMemo(
    () =>
      queue
        .slice(index + 1)
        .map((song, k) => ({ id: `${index + 1 + k}:${song.id}`, song, at: index + 1 + k })),
    [queue, index],
  );

  if (!open) return null;

  const current = queue[index];

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = upcoming.find((r) => r.id === e.active.id)?.at;
    const to = upcoming.find((r) => r.id === e.over?.id)?.at;
    if (from !== undefined && to !== undefined) moveInQueue(from, to);
  };

  return (
    <aside
      role="dialog"
      aria-label="Queue"
      className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70dvh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-2xl md:inset-x-auto md:top-0 md:right-0 md:bottom-player md:max-h-none md:w-96 md:rounded-none md:border-t-0 md:border-l"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">Queue</h2>
        <IconButton
          label="Close queue"
          icon={<X className="size-5" />}
          onClick={() => setQueueOpen(false)}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {current && (
          <section className="mb-4">
            <h3 className="px-2 pb-1 text-xs font-semibold tracking-wider text-muted uppercase">
              Now playing
            </h3>
            <div className="flex items-center gap-3 px-2 py-1.5">
              <Cover src={current.coverUrl} seed={current.id} className="size-10" rounded="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-accent">{current.title}</p>
                <p className="truncate text-xs text-muted">
                  {current.artist}
                  {source ? ` · ${source.name}` : ''}
                </p>
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between px-2 pb-1">
            <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">Next up</h3>
            {upcoming.length > 0 && (
              <Button variant="ghost" className="h-7 px-2 text-xs" onClick={clearQueue}>
                Clear
              </Button>
            )}
          </div>
          {upcoming.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted">Nothing queued after this song.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={upcoming.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-0.5">
                  {upcoming.map((r) => (
                    <QueueRow
                      key={r.id}
                      id={r.id}
                      song={r.song}
                      onRemove={() => removeFromQueue(r.at)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </div>
    </aside>
  );
}
