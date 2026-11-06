import { Library } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';

export function LibraryPage() {
  return (
    <>
      <PageHeader title="Library" subtitle="All your songs" />
      <EmptyState
        icon={<Library />}
        title="No songs yet"
        description="Songs you upload will appear here."
      />
    </>
  );
}
