import { describe, expect, it } from 'vitest';
import type { Folder } from '@/types/folder';
import type { Playlist } from '@/types/playlist';
import {
  buildTree,
  folderCreateError,
  folderMoveError,
  folderPath,
  flattenFolders,
  nextOrder,
} from './folderTree';

const folder = (id: string, name: string, parentId: string | null, order = 0): Folder => ({
  id,
  name,
  parentId,
  order,
  createdAt: null,
});

const playlist = (id: string, name: string, folderId: string | null): Playlist => ({
  id,
  name,
  description: null,
  coverUrl: null,
  folderId,
  songIds: [],
  createdAt: null,
  updatedAt: null,
});

describe('buildTree', () => {
  it('nests playlists and folders and sorts them', () => {
    const folders = [
      folder('gym', 'Gym', 'workout'),
      folder('workout', 'Workout', null, 1),
      folder('chill', 'Chill', null, 0),
    ];
    const playlists = [
      playlist('p1', 'Running', 'workout'),
      playlist('p2', 'Road trip', null),
      playlist('p3', 'Heavy', 'gym'),
      playlist('p4', 'Acoustic', 'chill'),
      playlist('p5', 'Abba', 'workout'),
    ];
    const tree = buildTree(folders, playlists);

    expect(tree.folders.map((n) => n.folder.name)).toEqual(['Chill', 'Workout']);
    const workout = tree.folders[1];
    expect(workout.playlists.map((p) => p.name)).toEqual(['Abba', 'Running']);
    expect(workout.folders.map((n) => n.folder.name)).toEqual(['Gym']);
    expect(workout.folders[0].playlists.map((p) => p.name)).toEqual(['Heavy']);
    expect(tree.playlists.map((p) => p.name)).toEqual(['Road trip']);
  });

  it('puts playlists with a missing folder at the root', () => {
    const tree = buildTree([], [playlist('p1', 'Lost', 'deleted-folder')]);
    expect(tree.playlists.map((p) => p.id)).toEqual(['p1']);
  });

  it('does not loop forever on a folder parent cycle', () => {
    const folders = [folder('a', 'A', 'b'), folder('b', 'B', 'a')];
    const tree = buildTree(folders, []);
    // Neither folder can reach a root, so both are shown at the top level and no node is lost.
    expect(tree.folders).toHaveLength(2);
  });
});

describe('folderMoveError', () => {
  const folders = [
    folder('work', 'Work', null),
    folder('gym', 'Gym', 'work'),
    folder('chill', 'Chill', null),
    folder('parent', 'Parent', null),
  ];

  it('allows moving a folder to the root', () => {
    expect(folderMoveError(folders, 'gym', null)).toBeNull();
  });

  it('prevents moving a folder into itself', () => {
    expect(folderMoveError(folders, 'chill', 'chill')).toMatch(/itself/);
  });

  it('prevents moving a folder into one of its own folders', () => {
    expect(folderMoveError(folders, 'work', 'gym')).toMatch(/own folders/);
  });

  it('prevents nesting deeper than one level', () => {
    expect(folderMoveError(folders, 'chill', 'gym')).toMatch(/one level/);
  });

  it('prevents moving a folder that already has folders inside it', () => {
    expect(folderMoveError(folders, 'work', 'chill')).toMatch(/has folders inside/);
  });

  it('allows moving an empty root folder into another root folder', () => {
    expect(folderMoveError(folders, 'chill', 'parent')).toBeNull();
  });
});

describe('folderCreateError and nextOrder', () => {
  const folders = [folder('work', 'Work', null, 2), folder('gym', 'Gym', 'work')];

  it('allows root folders and one nested level', () => {
    expect(folderCreateError(folders, null)).toBeNull();
    expect(folderCreateError(folders, 'work')).toBeNull();
  });

  it('refuses a folder under a nested folder', () => {
    expect(folderCreateError(folders, 'gym')).toMatch(/one level/);
  });

  it('refuses a parent that no longer exists', () => {
    expect(folderCreateError(folders, 'missing')).toMatch(/doesn't exist/);
  });

  it('puts new siblings last', () => {
    expect(nextOrder(folders, null)).toBe(3);
    expect(nextOrder(folders, 'work')).toBe(1);
  });
});

describe('flattenFolders and folderPath', () => {
  const folders = [folder('gym', 'Gym', 'work'), folder('work', 'Work', null)];

  it('labels nested folders with their path', () => {
    expect(flattenFolders(folders).map((r) => r.label)).toEqual(['Work', 'Work / Gym']);
  });

  it('returns the breadcrumb from the root down', () => {
    expect(folderPath(folders, 'gym').map((f) => f.name)).toEqual(['Work', 'Gym']);
    expect(folderPath(folders, 'missing')).toEqual([]);
  });
});
