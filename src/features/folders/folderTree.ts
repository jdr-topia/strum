import type { Folder } from '@/types/folder';
import type { Playlist } from '@/types/playlist';

/** Root folder + one nested level (decision #6 in docs/README.md). */
export const MAX_FOLDER_NESTING = 1;

export interface FolderNode {
  folder: Folder;
  folders: FolderNode[];
  playlists: Playlist[];
}

export interface PlaylistTree {
  folders: FolderNode[];
  /** Playlists at the root (no folder). */
  playlists: Playlist[];
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });

const byOrder = (a: Folder, b: Folder) => a.order - b.order || byName(a, b);

/** True if following parentId from `id` reaches a root without looping. */
function reachesRoot(id: string, byId: Map<string, Folder>): boolean {
  let cur = byId.get(id);
  for (let steps = 0; cur && cur.parentId; steps++) {
    if (steps > byId.size) return false;
    cur = byId.get(cur.parentId);
  }
  return cur !== undefined;
}

/**
 * Nested folders and playlists, sorted (folders by `order` then name, playlists by name).
 * Folders or playlists pointing at a missing folder, or in a broken parent loop, are shown at the root.
 */
export function buildTree(folders: Folder[], playlists: Playlist[]): PlaylistTree {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const nodes = new Map<string, FolderNode>(
    folders.map((f) => [f.id, { folder: f, folders: [], playlists: [] }]),
  );

  const roots: FolderNode[] = [];
  for (const folder of folders) {
    const node = nodes.get(folder.id)!;
    const parent = folder.parentId ? nodes.get(folder.parentId) : undefined;
    if (parent && reachesRoot(folder.id, byId)) parent.folders.push(node);
    else roots.push(node);
  }

  const rootPlaylists: Playlist[] = [];
  for (const playlist of playlists) {
    const node = playlist.folderId ? nodes.get(playlist.folderId) : undefined;
    if (node) node.playlists.push(playlist);
    else rootPlaylists.push(playlist);
  }

  const sortNode = (node: FolderNode) => {
    node.folders.sort((a, b) => byOrder(a.folder, b.folder));
    node.playlists.sort(byName);
    node.folders.forEach(sortNode);
  };
  roots.forEach(sortNode);
  roots.sort((a, b) => byOrder(a.folder, b.folder));
  rootPlaylists.sort(byName);

  return { folders: roots, playlists: rootPlaylists };
}

/** Folders in display order, each with its path label (e.g. "Workout / Gym") for pickers. */
export function flattenFolders(folders: Folder[]): { folder: Folder; label: string }[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const labelOf = (f: Folder): string => {
    const parent = f.parentId ? byId.get(f.parentId) : undefined;
    return parent ? `${labelOf(parent)} / ${f.name}` : f.name;
  };
  return folders
    .map((folder) => ({ folder, label: labelOf(folder) }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

/** Ancestors from the root down to (and including) the folder. Empty if unknown. */
export function folderPath(folders: Folder[], folderId: string): Folder[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: Folder[] = [];
  let cur = byId.get(folderId);
  while (cur && path.length <= folders.length) {
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

/** Next `order` value for a new folder among its siblings. */
export function nextOrder(folders: Folder[], parentId: string | null): number {
  const siblings = folders.filter((f) => f.parentId === parentId);
  return siblings.reduce((max, f) => Math.max(max, f.order + 1), 0);
}

/** Why a new folder can't be created under `parentId`, or null if it can. */
export function folderCreateError(folders: Folder[], parentId: string | null): string | null {
  if (parentId === null) return null;
  const parent = folders.find((f) => f.id === parentId);
  if (!parent) return "That folder doesn't exist any more.";
  if (parent.parentId !== null) return 'Folders can only be nested one level deep.';
  return null;
}

/** True if `nodeId` sits anywhere inside `ancestorId`. */
function isInside(folders: Folder[], nodeId: string, ancestorId: string): boolean {
  const byId = new Map(folders.map((f) => [f.id, f]));
  let cur = byId.get(nodeId);
  for (let steps = 0; cur && cur.parentId && steps <= folders.length; steps++) {
    if (cur.parentId === ancestorId) return true;
    cur = byId.get(cur.parentId);
  }
  return false;
}

/** Why `movingId` can't go inside `targetId` (null = root), or null if it can. */
export function folderMoveError(
  folders: Folder[],
  movingId: string,
  targetId: string | null,
): string | null {
  if (targetId === null) return null;
  if (targetId === movingId) return "A folder can't go inside itself.";
  const target = folders.find((f) => f.id === targetId);
  if (!target) return "That folder doesn't exist any more.";
  if (isInside(folders, targetId, movingId)) {
    return "A folder can't go inside one of its own folders.";
  }
  if (target.parentId !== null) return 'Folders can only be nested one level deep.';
  if (folders.some((f) => f.parentId === movingId)) {
    return "This folder has folders inside it, so it can't go inside another folder.";
  }
  return null;
}
