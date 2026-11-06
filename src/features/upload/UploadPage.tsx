import { Upload } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';

export function UploadPage() {
  return (
    <>
      <PageHeader title="Upload" />
      <EmptyState
        icon={<Upload />}
        title="Upload songs"
        description="Drag and drop audio files here. Coming soon."
      />
    </>
  );
}
