import clsx from 'clsx';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface SelectProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  /** Accessible name, since the trigger shows only the current option. */
  label: string;
  /** Fully rounded, as in the library toolbar. */
  pill?: boolean;
}

/**
 * Dropdown drawn by the app (not the browser's native list), so it matches the dark theme.
 * Keyboard: ↑/↓ move, Enter/Space choose, Home/End jump, Escape or Tab closes.
 */
export function Select<T extends string | number>({
  value,
  onChange,
  options,
  label,
  pill = false,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[selectedIndex];

  // Close when the user clicks or taps anywhere else.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  // Move keyboard focus into the list when it opens.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
  };

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openList();
    }
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const last = options.length - 1;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(last);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(active);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onTriggerKey}
        className={clsx(
          'flex h-10 w-full min-w-32 items-center justify-between gap-3 border border-border bg-surface-2 pr-3 pl-4 text-sm text-fg transition-colors outline-none hover:border-zinc-600 focus-visible:border-accent',
          pill ? 'rounded-full' : 'rounded-lg',
        )}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={clsx('size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
          className="absolute right-0 left-0 z-40 mt-1 max-h-72 min-w-full overflow-y-auto rounded-xl border border-border bg-surface-2 p-1 shadow-xl outline-none"
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            const isActive = i === active;
            return (
              <li
                key={String(option.value)}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSelected}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={clsx(
                  'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm whitespace-nowrap',
                  isActive ? 'bg-zinc-700 text-fg' : 'text-fg',
                  isSelected && 'font-semibold text-accent',
                )}
              >
                {option.label}
                {isSelected && <Check className="size-4 shrink-0" aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
