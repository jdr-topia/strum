import clsx from 'clsx';
import { useUploadStore, activeUploadCount } from './uploadStore';

/** Shows how many uploads are still running, on the Upload nav item. */
export function UploadBadge({ className }: { className?: string }) {
  const count = useUploadStore((s) => activeUploadCount(s.items));
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} uploads in progress`}
      className={clsx(
        'flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-fg tabular-nums',
        className,
      )}
    >
      {count}
    </span>
  );
}
