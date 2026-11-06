import { useState, type ReactNode } from 'react';
import { AddToPlaylistDialog } from '@/features/playlists/AddToPlaylistDialog';
import type { Song } from '@/types/song';
import { EditSongModal } from './EditSongModal';
import { useDeleteSongs } from './useDeleteSongs';
import { useSongVisibility } from './useSongVisibility';

/**
 * Edit, delete, share/unshare and add-to-playlist for song rows. Render `dialogs` once in the page;
 * the handlers open them.
 */
export function useSongActions(): {
  editSong: (song: Song) => void;
  deleteSong: (song: Song) => void;
  /** Flips the song between private and public (Discover). Own songs only. */
  togglePublic: (song: Song) => void;
  addToPlaylist: (songIds: string[]) => void;
  dialogs: ReactNode;
} {
  const [editing, setEditing] = useState<Song | null>(null);
  const [addingIds, setAddingIds] = useState<string[] | null>(null);
  const { deleteSongs } = useDeleteSongs();
  const { setPublic } = useSongVisibility();

  const dialogs = (
    <>
      {editing && (
        <EditSongModal key={editing.id} song={editing} onClose={() => setEditing(null)} />
      )}
      {addingIds && <AddToPlaylistDialog songIds={addingIds} onClose={() => setAddingIds(null)} />}
    </>
  );

  return {
    editSong: setEditing,
    deleteSong: (song) => {
      void deleteSongs([song.id], `Deleted "${song.title}"`);
    },
    togglePublic: (song) => {
      void setPublic([song], !song.isPublic);
    },
    addToPlaylist: setAddingIds,
    dialogs,
  };
}
