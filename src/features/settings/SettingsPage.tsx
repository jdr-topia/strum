import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/features/auth/useAuth';
import { FriendsSection } from '@/features/invites/FriendsSection';
import { InvitesSection } from '@/features/invites/InvitesSection';
import { useIsAdmin } from '@/features/invites/useIsAdmin';
import { DeletedFilesSection } from './DeletedFilesSection';

export function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const adminEmail = user?.email ?? '';

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-10 px-4 pb-8 md:px-8">
        {isAdmin && adminEmail && (
          <>
            <InvitesSection adminEmail={adminEmail} />
            <FriendsSection adminEmail={adminEmail} />
          </>
        )}
        <DeletedFilesSection />
      </div>
    </>
  );
}
