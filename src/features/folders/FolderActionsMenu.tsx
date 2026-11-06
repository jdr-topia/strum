import { EllipsisVertical, FolderInput, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Menu } from '@/components/Menu';
import { Modal } from '@/components/Modal';
import { NamePromptModal } from '@/components/NamePromptModal';
import { toast } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { usePlaylists } from '@/features/playlists/usePlaylists';
import { friendlyError } from '@/lib/errors';
import type { Folder } from '@/types/folder';
import { deleteFolder, moveFolder, renameFolder, type DeleteFolderMode } from './folderApi';
import { folderMoveError } from './folderTree';
import { MoveToDialog } from './MoveToDialog';
import { useFolders } from './useFolders';

type Dialog = 'rename' | 'move' | 'delete';

interface FolderActionsMenuProps {
  folder: Folder;
  /** Called after the folder is deleted (e.g. to leave its page). */
  onDeleted?: () => void;
  triggerClassName?: string;
}

/** Rename, move and delete for one folder. Delete offers two modes; songs are never deleted. */
export function FolderActionsMenu({ folder, onDeleted, triggerClassName }: FolderActionsMenuProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { folders } = useFolders();
  const { playlists } = usePlaylists();
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const childFolders = folders.filter((f) => f.parentId === folder.id).length;
  const childPlaylists = playlists.filter((p) => p.folderId === folder.id).length;

  const runDelete = async (mode: DeleteFolderMode) => {
    if (!uid) return;
    try {
      await deleteFolder(uid, folder, folders, playlists, mode);
      toast.success(
        mode === 'move'
          ? `Deleted “${folder.name}”. Its contents moved up a level.`
          : `Deleted “${folder.name}” and its playlists.`,
      );
      onDeleted?.();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't delete the folder. Try again."));
      throw err;
    }
  };

  return (
    <>
      <Menu
        align="end"
        trigger={({ toggle }) => (
          <IconButton
            label={`More options for ${folder.name}`}
            icon={<EllipsisVertical className="size-5" />}
            size="sm"
            onClick={toggle}
            className={triggerClassName}
          />
        )}
        items={[
          { label: 'Rename', icon: <Pencil />, onSelect: () => setDialog('rename') },
          { label: 'Move to…', icon: <FolderInput />, onSelect: () => setDialog('move') },
          { label: 'Delete', icon: <Trash2 />, danger: true, onSelect: () => setDialog('delete') },
        ]}
      />

      {dialog === 'rename' && uid && (
        <NamePromptModal
          open
          onClose={() => setDialog(null)}
          title="Rename folder"
          label="Folder name"
          initialValue={folder.name}
          submitLabel="Save"
          onSubmit={(name) => renameFolder(uid, folder.id, name)}
        />
      )}

      {dialog === 'move' && uid && (
        <MoveToDialog
          title={`Move “${folder.name}”`}
          folders={folders}
          currentFolderId={folder.parentId}
          targetError={(target) => folderMoveError(folders, folder.id, target)}
          onMove={(target) => moveFolder(uid, folder.id, target, folders)}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === 'delete' && (
        <Modal
          open
          onClose={() => setDialog(null)}
          title={`Delete “${folder.name}”?`}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await runDelete('delete').catch(() => undefined);
                  setDialog(null);
                }}
              >
                Delete folder and its playlists
              </Button>
              <Button
                onClick={async () => {
                  await runDelete('move').catch(() => undefined);
                  setDialog(null);
                }}
              >
                Move contents to parent
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted">
            This folder holds {childPlaylists} {childPlaylists === 1 ? 'playlist' : 'playlists'}
            {childFolders > 0 &&
              ` and ${childFolders} ${childFolders === 1 ? 'folder' : 'folders'}`}
            . Moving the contents keeps them. Deleting also deletes the playlists. Your songs are
            never deleted.
          </p>
        </Modal>
      )}
    </>
  );
}
