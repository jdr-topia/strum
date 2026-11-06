import { Folder } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';

export function FolderPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <PageHeader title="Folder" subtitle={id} />
      <EmptyState icon={<Folder />} title="This folder is empty" />
    </>
  );
}
