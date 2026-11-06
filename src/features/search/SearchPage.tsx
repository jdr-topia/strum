import { Search } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';

export function SearchPage() {
  return (
    <>
      <PageHeader title="Search" />
      <EmptyState
        icon={<Search />}
        title="Search your library"
        description="Find songs, artists, albums and playlists."
      />
    </>
  );
}
