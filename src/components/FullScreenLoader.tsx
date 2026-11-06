import { Spinner } from './Spinner';

export function FullScreenLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner className="size-8" label={label} />
    </div>
  );
}
