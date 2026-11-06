import { Folder } from 'lucide-react';
import { Fragment } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Spinner } from '@/components/Spinner';
import { FolderActionsMenu } from './FolderActionsMenu';
import { FolderContents } from './FolderContents';
import { folderPath } from './folderTree';
import { useFolders } from './useFolders';

export function FolderPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { folders, loading } = useFolders();

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Loading folder" />
      </div>
    );
  }

  const folder = folders.find((f) => f.id === id);
  if (!folder) {
    return (
      <>
        <PageHeader title="Folder not found" />
        <EmptyState
          icon={<Folder />}
          title="This folder doesn't exist any more"
          action={
            <Button variant="secondary" onClick={() => navigate('/library?view=playlists')}>
              Back to playlists
            </Button>
          }
        />
      </>
    );
  }

  const path = folderPath(folders, folder.id);
  const ancestors = path.slice(0, -1);

  return (
    <>
      <nav aria-label="Breadcrumb" className="px-4 pt-6 text-sm text-muted md:px-8 md:pt-8">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link to="/library?view=playlists" className="hover:text-fg">
              Playlists
            </Link>
          </li>
          {ancestors.map((f) => (
            <Fragment key={f.id}>
              <li aria-hidden>/</li>
              <li>
                <Link to={`/folder/${f.id}`} className="hover:text-fg">
                  {f.name}
                </Link>
              </li>
            </Fragment>
          ))}
        </ol>
      </nav>
      <PageHeader
        title={folder.name}
        actions={
          <FolderActionsMenu
            folder={folder}
            onDeleted={() => navigate('/library?view=playlists')}
          />
        }
      />
      <FolderContents folderId={folder.id} />
    </>
  );
}
