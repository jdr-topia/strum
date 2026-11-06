import clsx from 'clsx';
import { CircleAlert, CircleCheck, RotateCcw, X } from 'lucide-react';
import { Cover } from '@/components/Cover';
import { IconButton } from '@/components/IconButton';
import { formatBytes, formatDuration } from '@/lib/formatters';
import type { Song } from '@/types/song';
import { findDuplicate } from './duplicates';
import type { UploadEdit, UploadItem } from './uploadStore';

interface UploadReviewRowProps {
  item: UploadItem;
  library: Song[];
  onEdit: (id: string, edit: UploadEdit) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

const inputClass =
  'h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2.5 text-sm outline-none focus:border-accent disabled:opacity-60';

export function UploadReviewRow({
  item,
  library,
  onEdit,
  onRemove,
  onRetry,
}: UploadReviewRowProps) {
  const editable = item.status === 'pending';
  const duplicate = editable
    ? findDuplicate(
        { title: item.title, artist: item.artist, durationSec: item.durationSec },
        library,
      )
    : undefined;

  return (
    <li className="flex gap-3 rounded-lg border border-border bg-surface p-3">
      <Cover src={item.coverPreviewUrl} seed={item.id} className="size-14" rounded="md" alt="" />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            aria-label="Title"
            className={inputClass}
            value={item.title}
            disabled={!editable}
            onChange={(e) => onEdit(item.id, { title: e.target.value })}
          />
          <input
            aria-label="Artist"
            className={inputClass}
            value={item.artist}
            disabled={!editable}
            onChange={(e) => onEdit(item.id, { artist: e.target.value })}
          />
          <input
            aria-label="Album"
            className={inputClass}
            value={item.album}
            placeholder="Album"
            disabled={!editable}
            onChange={(e) => onEdit(item.id, { album: e.target.value })}
          />
        </div>

        <p className="truncate text-xs text-muted">
          {item.file.name} · {formatDuration(item.durationSec)} · {formatBytes(item.file.size)}
        </p>

        {duplicate && (
          <p className="text-xs text-danger">
            Looks like a duplicate of “{duplicate.title}”. Remove this row to skip it.
          </p>
        )}

        <StatusLine item={item} onRetry={onRetry} />
      </div>

      {editable || item.status === 'error' ? (
        <IconButton
          label={`Remove ${item.file.name}`}
          icon={<X className="size-4" />}
          size="sm"
          onClick={() => onRemove(item.id)}
        />
      ) : null}
    </li>
  );
}

function StatusLine({ item, onRetry }: { item: UploadItem; onRetry: (id: string) => void }) {
  switch (item.status) {
    case 'pending':
      return <p className="text-xs text-muted">Ready to upload</p>;
    case 'uploading':
      return (
        <div className="space-y-1">
          <div
            role="progressbar"
            aria-label={`Uploading ${item.file.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={item.progress}
            className="h-1.5 overflow-hidden rounded-full bg-surface-2"
          >
            <div
              className="h-full bg-accent transition-[width]"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <p className="text-xs text-muted">Uploading {item.progress}%</p>
        </div>
      );
    case 'saving':
      return <p className="text-xs text-muted">Saving to your library…</p>;
    case 'done':
      return (
        <p className={clsx('flex items-center gap-1 text-xs text-accent')}>
          <CircleCheck className="size-3.5" aria-hidden /> Added to your library
        </p>
      );
    case 'error':
      return (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="flex items-center gap-1 text-xs text-danger">
            <CircleAlert className="size-3.5" aria-hidden /> {item.error}
          </p>
          <button
            type="button"
            onClick={() => onRetry(item.id)}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <RotateCcw className="size-3" aria-hidden /> Retry
          </button>
        </div>
      );
  }
}
