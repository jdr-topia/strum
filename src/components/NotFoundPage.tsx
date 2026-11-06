import { Link } from 'react-router-dom';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <EmptyState
        title="That page doesn't exist"
        action={
          <Link to="/" className="text-sm font-semibold text-accent hover:underline">
            Go home
          </Link>
        }
      />
    </>
  );
}
