import {
  CopyPlus,
  EllipsisVertical,
  FolderInput,
  Pencil,
  Play,
  Shuffle,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { IconButton } from '@/components/IconButton';
import { Menu } from '@/components/Menu';
import { NamePromptModal } from '@/components/NamePromptModal';
import { toast } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { useFolders } from '@/features/folders/useFolders';
import { MoveToDialog } from '@/features/folders/MoveToDialog';
import { useSongs } from '@/features/library/useSongs';
import { friendlyError } from '@/lib/errors';
import type { Playlist } from '@/types/playlist';
import { deletePlaylist, duplicatePlaylist, movePlaylist, renamePlaylist } from './playlistApi';
import { playPlaylist } from './playPlaylist';
import { resolvePlaylistSongs } from './resolvePlaylistSongs';

type Dialog = 'rename' | 'move' | 'delete';

interface PlaylistActionsMenuProps {
  playlist: Playlist;
  /** Called after the playlist is deleted (e.g. to leave its page). */
  onDeleted?: () => void;
  triggerClassName?: string;
}

/** Play, shuffle, rename, move, duplicate and delete for one playlist. */
export function PlaylistActionsMenu({
  playlist,
  onDeleted,
  triggerClassName,
}: PlaylistActionsMenuProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { songs: library } = useSongs();
  const { folders } = useFolders();
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const songs = () => resolvePlaylistSongs(playlist.songIds, library);

  const duplicate = async () => {
    if (!uid) return;
    try {
      await duplicatePlaylist(uid, playlist);
      toast.success(`Copied “${playlist.name}”`);
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't copy the playlist. Try again."));
    }
  };

  return (
    <>
      <Menu
        align="end"
        trigger={({ toggle }) => (
          <IconButton
            label={`More options for ${playlist.name}`}
            icon={<EllipsisVertical className="size-5" />}
            size="sm"
            onClick={toggle}
            className={triggerClassName}
          />
        )}
        items={[
          { label: 'Play', icon: <Play />, onSelect: () => playPlaylist(playlist, songs()) },
          {
            label: 'Shuffle play',
            icon: <Shuffle />,
            onSelect: () => playPlaylist(playlist, songs(), { shuffle: true }),
          },
          { label: 'Rename', icon: <Pencil />, onSelect: () => setDialog('rename') },
          { label: 'Move to…', icon: <FolderInput />, onSelect: () => setDialog('move') },
          { label: 'Duplicate', icon: <CopyPlus />, onSelect: duplicate },
          { label: 'Delete', icon: <Trash2 />, danger: true, onSelect: () => setDialog('delete') },
        ]}
      />

      {dialog === 'rename' && uid && (
        <NamePromptModal
          open
          onClose={() => setDialog(null)}
          title="Rename playlist"
          label="Playlist name"
          initialValue={playlist.name}
          submitLabel="Save"
          onSubmit={(name) => renamePlaylist(uid, playlist.id, name)}
        />
      )}

      {dialog === 'move' && uid && (
        <MoveToDialog
          title={`Move “${playlist.name}”`}
          folders={folders}
          currentFolderId={playlist.folderId}
          onMove={(target) => movePlaylist(uid, playlist.id, target)}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === 'delete' && uid && (
        <ConfirmModal
          open
          onClose={() => setDialog(null)}
          title={`Delete “${playlist.name}”?`}
          description="The playlist is removed. Its songs stay in your library."
          confirmLabel="Delete playlist"
          onConfirm={async () => {
            await deletePlaylist(uid, playlist.id);
            toast.success(`Deleted “${playlist.name}”`);
            onDeleted?.();
          }}
        />
      )}
    </>
  );
}
