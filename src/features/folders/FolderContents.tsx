import { ListMusic } from 'lucide-react';
import { useMemo } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import { PlaylistCard } from '@/features/playlists/PlaylistCard';
import { resolvePlaylistSongs } from '@/features/playlists/resolvePlaylistSongs';
import { usePlaylists } from '@/features/playlists/usePlaylists';
import { usePlayableSongs } from '@/features/discover/usePublicSongs';
import { FolderCard } from './FolderCard';
import { NewItemMenu } from './NewItemMenu';
import { useFolders } from './useFolders';

interface FolderContentsProps {
  /** null = the library root. */
  folderId: string | null;
}

/** Child folders and playlists of one level, as a grid, with "+ New" on top. */
export function FolderContents({ folderId }: FolderContentsProps) {
  const { folders, loading: foldersLoading } = useFolders();
  const { playlists, loading: playlistsLoading } = usePlaylists();
  const { songs: library, loading: songsLoading } = usePlayableSongs();

  const childFolders = useMemo(
    () =>
      folders
        .filter((f) => f.parentId === folderId)
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    [folders, folderId],
  );

  const childPlaylists = useMemo(
    () =>
      playlists
        .filter((p) => p.folderId === folderId)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [playlists, folderId],
  );

  // Songs shown on each playlist card, resolved once per library/playlist change.
  const cardSongs = useMemo(
    () => new Map(childPlaylists.map((p) => [p.id, resolvePlaylistSongs(p.songIds, library)])),
    [childPlaylists, library],
  );

  const loading = foldersLoading || playlistsLoading || songsLoading;
  const empty = childFolders.length === 0 && childPlaylists.length === 0;

  return (
    <div className="px-4 pb-6 md:px-8">
      <div className="mb-4 flex justify-end">
        <NewItemMenu folderId={folderId} />
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner label="Loading" />
        </div>
      )}

      {!loading && empty && (
        <EmptyState
          icon={<ListMusic />}
          title={folderId ? 'This folder is empty' : 'No playlists yet'}
          description={
            folderId
              ? 'Add playlists or folders here with “New”.'
              : 'Create a playlist, or a folder to group them.'
          }
        />
      )}

      {!loading && !empty && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {childFolders.map((folder) => (
            <li key={`f-${folder.id}`}>
              <FolderCard
                folder={folder}
                playlistCount={playlists.filter((p) => p.folderId === folder.id).length}
                folderCount={folders.filter((f) => f.parentId === folder.id).length}
              />
            </li>
          ))}
          {childPlaylists.map((playlist) => (
            <li key={`p-${playlist.id}`}>
              <PlaylistCard playlist={playlist} songs={cardSongs.get(playlist.id) ?? []} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
