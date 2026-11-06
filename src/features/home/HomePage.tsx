import { House } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';

export function HomePage() {
  return (
    <>
      <PageHeader title="Home" />
      <EmptyState
        icon={<House />}
        title="Welcome to Strum"
        description="Recently played songs and playlists will show up here."
      />
    </>
  );
}
