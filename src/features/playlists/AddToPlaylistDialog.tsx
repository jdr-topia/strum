import { Check, ListMusic, Plus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { flattenFolders } from '@/features/folders/folderTree';
import { useFolders } from '@/features/folders/useFolders';
import { friendlyError } from '@/lib/errors';
import { normalizeText } from '@/lib/keywords';
import type { Playlist } from '@/types/playlist';
import { addSongs, createPlaylist } from './playlistApi';
import { usePlaylists } from './usePlaylists';

interface AddToPlaylistDialogProps {
  songIds: string[];
  onClose: () => void;
}

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent';

/**
 * Adds one or more songs to a playlist. Playlists that already hold every song show a check.
 * Adding never creates duplicates (arrayUnion).
 */
export function AddToPlaylistDialog({ songIds, onClose }: AddToPlaylistDialogProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { playlists, loading } = usePlaylists();
  const { folders } = useFolders();
  const [filter, setFilter] = useState('');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const labels = useMemo(
    () => new Map(flattenFolders(folders).map((r) => [r.folder.id, r.label])),
    [folders],
  );

  const visible = useMemo(() => {
    const words = normalizeText(filter).split(' ').filter(Boolean);
    return [...playlists]
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      .filter((p) => {
        const text = normalizeText(p.name);
        return words.every((w) => text.includes(w));
      });
  }, [playlists, filter]);

  const folderLabel = (p: Playlist) => (p.folderId ? labels.get(p.folderId) : undefined);
  const hasAll = (p: Playlist) => songIds.every((id) => p.songIds.includes(id));

  const addTo = async (playlist: Playlist) => {
    if (!uid) return;
    const missing = songIds.filter((id) => !playlist.songIds.includes(id));
    if (missing.length === 0) return;
    setBusy(true);
    try {
      await addSongs(uid, playlist.id, missing);
      toast.success(
        missing.length === 1 ? `Added to “${playlist.name}”` : `Added ${missing.length} songs`,
      );
      onClose();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't add to that playlist. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const createAndAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setBusy(true);
    try {
      const id = await createPlaylist(uid, newName);
      await addSongs(uid, id, songIds);
      toast.success(`Created “${newName.trim()}” and added the songs`);
      onClose();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't create that playlist. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Add to playlist">
      <form onSubmit={createAndAdd} className="mb-3 flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">New playlist name</span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New playlist"
            maxLength={150}
            className={inputClass}
          />
        </label>
        <Button type="submit" variant="secondary" disabled={busy || !newName.trim()}>
          <Plus className="size-4" aria-hidden />
          Create
        </Button>
      </form>

      <label className="mb-2 block">
        <span className="sr-only">Find a playlist</span>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Find a playlist"
          className={inputClass}
        />
      </label>

      <ul className="max-h-[50dvh] space-y-0.5 overflow-y-auto">
        {loading && <li className="py-6 text-center text-sm text-muted">Loading playlists…</li>}
        {!loading && visible.length === 0 && (
          <li className="py-6 text-center text-sm text-muted">
            {playlists.length === 0 ? 'No playlists yet. Create one above.' : 'No matches.'}
          </li>
        )}
        {visible.map((p) => {
          const added = hasAll(p);
          const folder = folderLabel(p);
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={busy || added}
                onClick={() => addTo(p)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-2 disabled:opacity-60"
              >
                <ListMusic className="size-5 shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {folder ?? 'Library'} · {p.songIds.length}{' '}
                    {p.songIds.length === 1 ? 'song' : 'songs'}
                  </span>
                </span>
                {added && (
                  <span className="flex items-center gap-1 text-xs text-accent">
                    <Check className="size-4" aria-hidden />
                    Added
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
