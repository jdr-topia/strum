import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { filterSongs } from '@/features/library/sortSongs';
import { friendlyError } from '@/lib/errors';
import type { Playlist } from '@/types/playlist';
import type { Song } from '@/types/song';
import { addSongs } from './playlistApi';

interface AddSongsDialogProps {
  playlist: Playlist;
  /** The user's library (not deleted songs). */
  library: Song[];
  onClose: () => void;
}

/** Pick library songs to add to this playlist. Songs already in it are not listed. */
export function AddSongsDialog({ playlist, library, onClose }: AddSongsDialogProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  const inPlaylist = useMemo(() => new Set(playlist.songIds), [playlist.songIds]);
  const candidates = useMemo(
    () =>
      filterSongs(
        library.filter((s) => !inPlaylist.has(s.id)),
        query,
      ),
    [library, inPlaylist, query],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const add = async () => {
    if (!uid || selected.size === 0) return;
    setBusy(true);
    try {
      const ids = [...selected];
      await addSongs(uid, playlist.id, ids);
      toast.success(ids.length === 1 ? 'Added 1 song' : `Added ${ids.length} songs`);
      onClose();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't add those songs. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Add songs"
      footer={
        <Button onClick={add} disabled={busy || selected.size === 0}>
          Add {selected.size > 0 ? selected.size : ''} {selected.size === 1 ? 'song' : 'songs'}
        </Button>
      }
    >
      <label className="mb-3 block">
        <span className="sr-only">Find songs</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find songs in your library"
          className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent"
        />
      </label>
      {candidates.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          {library.length === inPlaylist.size
            ? 'Every song in your library is already here.'
            : 'No songs match.'}
        </p>
      ) : (
        <ul className="max-h-[50dvh] space-y-0.5 overflow-y-auto">
          {candidates.map((song) => {
            const checked = selected.has(song.id);
            return (
              <li key={song.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggle(song.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
                >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded border ${checked ? 'border-accent bg-accent text-accent-fg' : 'border-muted'}`}
                    aria-hidden
                  >
                    {checked && '✓'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{song.title}</span>
                    <span className="block truncate text-xs text-muted">{song.artist}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
