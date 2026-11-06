import clsx from 'clsx';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useToastStore, type ToastKind } from './toastStore';

const icons: Record<ToastKind, typeof Info> = {
  info: Info,
  success: CircleCheck,
  error: CircleAlert,
};

const colors: Record<ToastKind, string> = {
  info: 'text-muted',
  success: 'text-accent',
  error: 'text-danger',
};

/** Renders active toasts. Mount once near the root. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--spacing-player)+var(--spacing-tabbar)+0.75rem)] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-[calc(var(--spacing-player)+1rem)]"
    >
      {toasts.map((t) => {
        const Icon = icons[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm shadow-xl"
          >
            <Icon className={clsx('mt-0.5 size-4 shrink-0', colors[t.kind])} aria-hidden />
            <p className="flex-1">{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="text-muted hover:text-fg"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
