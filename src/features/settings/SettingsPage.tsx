import { PageHeader } from '@/components/PageHeader';
import { DeletedFilesSection } from './DeletedFilesSection';

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="px-4 pb-8 md:px-8">
        <DeletedFilesSection />
      </div>
    </>
  );
}
