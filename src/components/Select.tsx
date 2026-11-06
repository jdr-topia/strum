import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Fully rounded, as in the library toolbar. */
  pill?: boolean;
}

/**
 * Dropdown in the app's style. It keeps the native list, so it works well on phones.
 * The list's colours are set globally in index.css so it matches the dark theme.
 */
export function Select({ pill = false, className, children, ...props }: SelectProps) {
  return (
    <span className="relative inline-flex">
      <select
        className={clsx(
          'h-10 appearance-none border border-border bg-surface-2 py-0 pr-9 pl-3 text-sm text-fg outline-none focus:border-accent',
          pill ? 'rounded-full' : 'rounded-lg',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </span>
  );
}
