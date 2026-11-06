import clsx from 'clsx';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface MenuProps {
  /** Renders the trigger; call `toggle` on click. */
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
  /** Open above the trigger instead of below (e.g. in a footer). */
  up?: boolean;
  /** Non-interactive content shown above the items (e.g. account name/email). */
  header?: ReactNode;
}

/** Simple dropdown menu. Closes on outside click, Escape, or selection. */
export function Menu({ trigger, items, align = 'end', up = false, header }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <ul
          role="menu"
          className={clsx(
            'absolute z-40 min-w-44 rounded-lg border border-border bg-surface-2 p-1 shadow-xl',
            align === 'end' ? 'right-0' : 'left-0',
            up ? 'bottom-full mb-1' : 'mt-1',
          )}
        >
          {header && (
            <li role="none" className="mb-1 max-w-64 border-b border-border pb-1">
              {header}
            </li>
          )}
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-700 disabled:opacity-50',
                  item.danger && 'text-danger',
                )}
              >
                {item.icon && <span className="[&_svg]:size-4">{item.icon}</span>}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
