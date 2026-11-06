import { ListMusic } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <PageHeader title="Playlist" subtitle={id} />
      <EmptyState icon={<ListMusic />} title="This playlist is empty" />
    </>
  );
}
