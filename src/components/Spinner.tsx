import clsx from 'clsx';
import { LoaderCircle } from 'lucide-react';

interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" className="inline-flex">
      <LoaderCircle className={clsx('size-6 animate-spin text-muted', className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
