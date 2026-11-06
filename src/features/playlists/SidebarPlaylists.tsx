import clsx from 'clsx';
import { ChevronRight, Folder as FolderIcon, ListMusic } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { FolderActionsMenu } from '@/features/folders/FolderActionsMenu';
import { buildTree, type FolderNode } from '@/features/folders/folderTree';
import { NewItemMenu } from '@/features/folders/NewItemMenu';
import { useFolders } from '@/features/folders/useFolders';
import { useSongs } from '@/features/library/useSongs';
import type { Playlist } from '@/types/playlist';
import { PlaylistActionsMenu } from './PlaylistActionsMenu';
import { usePlaylists } from './usePlaylists';

const EXPANDED_KEY = 'strum.sidebar.expanded';

function loadExpanded(): Set<string> {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveExpanded(ids: Set<string>): void {
  try {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage blocked: the tree simply won't remember its state.
  }
}

const rowLink = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
    isActive ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg',
  );

/** Playlists and folders in the desktop sidebar. Expanded folders are remembered on this device. */
export function SidebarPlaylists() {
  const { folders } = useFolders();
  const { playlists } = usePlaylists();
  const { songs: library } = useSongs();
  const [expanded, setExpanded] = useState<Set<string>>(loadExpanded);
  const tree = useMemo(() => buildTree(folders, playlists), [folders, playlists]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveExpanded(next);
      return next;
    });
  };

  const playlistRow = (playlist: Playlist, depth: number): ReactNode => (
    <li key={`p-${playlist.id}`} className="group flex items-center gap-1 pr-1">
      <NavLink
        to={`/playlist/${playlist.id}`}
        className={rowLink}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <ListMusic className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{playlist.name}</span>
      </NavLink>
      <PlaylistActionsMenu playlist={playlist} triggerClassName="size-7" />
    </li>
  );

  const folderRow = (node: FolderNode, depth: number): ReactNode => {
    const isOpen = expanded.has(node.folder.id);
    return (
      <li key={`f-${node.folder.id}`}>
        <div className="group flex items-center gap-1 pr-1">
          <button
            type="button"
            aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.folder.name}`}
            aria-expanded={isOpen}
            onClick={() => toggle(node.folder.id)}
            className="flex size-6 shrink-0 items-center justify-center rounded text-muted hover:text-fg"
            style={{ marginLeft: depth * 14 }}
          >
            <ChevronRight className={clsx('size-4 transition-transform', isOpen && 'rotate-90')} />
          </button>
          <NavLink to={`/folder/${node.folder.id}`} className={rowLink} style={{ paddingLeft: 4 }}>
            <FolderIcon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{node.folder.name}</span>
          </NavLink>
          <FolderActionsMenu folder={node.folder} triggerClassName="size-7" />
        </div>
        {isOpen && (
          <ul className="space-y-0.5">
            {node.folders.map((child) => folderRow(child, depth + 1))}
            {node.playlists.map((p) => playlistRow(p, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  const empty = tree.folders.length === 0 && tree.playlists.length === 0;

  return (
    <section className="mt-4 flex min-h-0 flex-1 flex-col border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2 px-3 pb-2">
        <h2 className="text-xs font-semibold tracking-wider text-muted uppercase">Playlists</h2>
        <NewItemMenu folderId={null} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted">
            <ListMusic className="size-4" aria-hidden />
            {library.length > 0 ? 'No playlists yet' : 'Upload songs to start a playlist'}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {tree.folders.map((node) => folderRow(node, 0))}
            {tree.playlists.map((p) => playlistRow(p, 0))}
          </ul>
        )}
      </div>
    </section>
  );
}
