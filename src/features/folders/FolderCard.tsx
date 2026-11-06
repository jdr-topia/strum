import { Folder as FolderIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { Folder } from '@/types/folder';
import { FolderActionsMenu } from './FolderActionsMenu';

interface FolderCardProps {
  folder: Folder;
  playlistCount: number;
  folderCount: number;
}

/** Grid card linking to a folder, with its actions menu in the corner. */
export function FolderCard({ folder, playlistCount, folderCount }: FolderCardProps) {
  const parts = [
    `${playlistCount} ${playlistCount === 1 ? 'playlist' : 'playlists'}`,
    folderCount > 0 ? `${folderCount} ${folderCount === 1 ? 'folder' : 'folders'}` : null,
  ].filter(Boolean);

  return (
    <div className="group relative">
      <NavLink
        to={`/folder/${folder.id}`}
        className="block rounded-xl p-2 transition-colors hover:bg-surface-2"
      >
        <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-surface-2">
          <FolderIcon className="size-1/3 text-muted" aria-hidden />
        </div>
        <p className="mt-2 truncate text-sm font-medium">{folder.name}</p>
        <p className="truncate text-xs text-muted">{parts.join(' · ')}</p>
      </NavLink>
      <div className="absolute top-3 right-3">
        <FolderActionsMenu
          folder={folder}
          triggerClassName="bg-black/50 text-white hover:bg-black/70 hover:text-white"
        />
      </div>
    </div>
  );
}
