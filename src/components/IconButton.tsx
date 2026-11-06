import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name — required because the button has no visible text. */
  label: string;
  icon: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'size-8', md: 'size-10', lg: 'size-12' };

export function IconButton({
  label,
  icon,
  size = 'md',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:pointer-events-none disabled:opacity-50',
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
