import { TriangleAlert } from 'lucide-react';

interface ConfigErrorScreenProps {
  problems: string[];
}

export function ConfigErrorScreen({ problems }: ConfigErrorScreenProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center gap-3">
          <TriangleAlert className="size-6 shrink-0 text-danger" aria-hidden />
          <h1 className="text-lg font-semibold">Strum isn&apos;t configured yet</h1>
        </div>
        <p className="mb-3 text-sm text-muted">The app couldn&apos;t start because of:</p>
        <ul className="mb-4 list-disc space-y-1 pl-5 font-mono text-sm break-all">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          Copy <code className="text-fg">.env.example</code> to{' '}
          <code className="text-fg">.env.local</code>, fill in the values, and restart{' '}
          <code className="text-fg">npm run dev</code>.
        </p>
      </div>
    </main>
  );
}
