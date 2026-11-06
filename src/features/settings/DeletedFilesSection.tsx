import { RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { toast } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { hardDeleteSongs, restoreSongs } from '@/features/library/songApi';
import { sortSongs } from '@/features/library/sortSongs';
import { useSongs } from '@/features/library/useSongs';
import type { Song } from '@/types/song';

/** Lists to-be-removed songs, so their Cloudinary files can be deleted by hand, then purged. */
export function DeletedFilesSection() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { songs, loading, error } = useSongs(true);
  const [busy, setBusy] = useState(false);
  const sorted = useMemo(() => sortSongs(songs, 'title'), [songs]);

  /** Audio and cover public IDs, one per line, for pasting into the Cloudinary Media Library. */
  const cloudinaryIds = (list: Song[]) =>
    list.flatMap((s) => [s.cloudinaryPublicId, s.coverPublicId]).filter((id): id is string => !!id);

  const copyIds = async () => {
    try {
      await navigator.clipboard.writeText(cloudinaryIds(sorted).join('\n'));
      toast.success('Cloudinary IDs copied');
    } catch {
      toast.error("Couldn't copy. Your browser blocked clipboard access.");
    }
  };

  const restore = async (song: Song) => {
    if (!uid) return;
    try {
      await restoreSongs(uid, [song.id]);
      toast.success(`Restored "${song.title}"`);
    } catch {
      toast.error("Couldn't restore that song. Check your connection.");
    }
  };

  const purge = async () => {
    if (!uid || sorted.length === 0) return;
    const ok = window.confirm(
      `Remove ${sorted.length} ${sorted.length === 1 ? 'song' : 'songs'} from Strum for good?\n\n` +
        'Delete their files in the Cloudinary Media Library first, or they will stay there.',
    );
    if (!ok) return;
    setBusy(true);
    try {
      await hardDeleteSongs(
        uid,
        sorted.map((s) => s.id),
      );
      toast.success('Deleted songs removed from Strum');
    } catch {
      toast.error("Couldn't remove them. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="deleted-files-heading" className="space-y-4">
      <div>
        <h2 id="deleted-files-heading" className="text-lg font-semibold">
          Deleted files
        </h2>
        <p className="mt-1 text-sm text-muted">
          Songs you deleted are hidden, not removed. Restore them here, or copy their Cloudinary IDs
          to delete the files in the Cloudinary console, then remove them from Strum.
        </p>
      </div>

      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-danger">Couldn't load deleted songs.</p>}

      {!loading && !error && sorted.length === 0 && (
        <p className="text-sm text-muted">Nothing here. Deleted songs will show up in this list.</p>
      )}

      {sorted.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={copyIds}>
              Copy Cloudinary IDs
            </Button>
            <Button variant="danger" onClick={purge} disabled={busy}>
              <Trash2 className="size-4" aria-hidden />
              I've removed them from Cloudinary
            </Button>
          </div>

          <ul className="divide-y divide-border rounded-lg border border-border">
            {sorted.map((song) => (
              <li key={song.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{song.title}</p>
                  <p className="truncate text-xs text-muted">{song.artist}</p>
                </div>
                <IconButton
                  label={`Restore ${song.title}`}
                  icon={<RotateCcw className="size-4" />}
                  size="sm"
                  onClick={() => restore(song)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
