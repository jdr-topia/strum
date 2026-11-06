import { FolderPlus, ListPlus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Menu } from '@/components/Menu';
import { NamePromptModal } from '@/components/NamePromptModal';
import { toast } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { createPlaylist } from '@/features/playlists/playlistApi';
import { createFolder } from './folderApi';
import { folderCreateError } from './folderTree';
import { useFolders } from './useFolders';
import { useNavigate } from 'react-router-dom';

interface NewItemMenuProps {
  /** Where the new item goes: null for the library root. */
  folderId: string | null;
}

/** "+ New" menu: a playlist (opens it when created) or a folder, placed in `folderId`. */
export function NewItemMenu({ folderId }: NewItemMenuProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { folders } = useFolders();
  const navigate = useNavigate();
  const [kind, setKind] = useState<'playlist' | 'folder' | null>(null);
  const folderBlocked = folderCreateError(folders, folderId);

  return (
    <>
      <Menu
        align="end"
        trigger={({ toggle }) => (
          <Button variant="secondary" className="h-9 px-4" onClick={toggle} aria-haspopup="menu">
            <Plus className="size-4" aria-hidden />
            New
          </Button>
        )}
        items={[
          { label: 'New playlist', icon: <ListPlus />, onSelect: () => setKind('playlist') },
          {
            label: 'New folder',
            icon: <FolderPlus />,
            disabled: folderBlocked !== null,
            onSelect: () => setKind('folder'),
          },
        ]}
      />

      {kind === 'playlist' && uid && (
        <NamePromptModal
          open
          onClose={() => setKind(null)}
          title="New playlist"
          label="Playlist name"
          submitLabel="Create"
          onSubmit={async (name) => {
            const id = await createPlaylist(uid, name, folderId);
            navigate(`/playlist/${id}`);
          }}
        />
      )}

      {kind === 'folder' && uid && (
        <NamePromptModal
          open
          onClose={() => setKind(null)}
          title="New folder"
          label="Folder name"
          submitLabel="Create"
          onSubmit={async (name) => {
            // The prompt shows any error; it stays open so the name can be fixed.
            await createFolder(uid, name, folderId, folders);
            toast.success(`Created “${name.trim()}”`);
          }}
        />
      )}
    </>
  );
}
