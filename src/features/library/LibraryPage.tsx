import { CheckSquare, Library, Search, Upload, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Spinner } from '@/components/Spinner';
import { toast } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { LIBRARY_SOURCE, usePlayerStore } from '@/features/player/playerStore';
import type { Song } from '@/types/song';
import { EditSongModal } from './EditSongModal';
import { restoreSongs, softDeleteSongs } from './songApi';
import { SongRow } from './SongRow';
import { filterSongs, SONG_SORT_LABELS, sortSongs, type SongSort } from './sortSongs';
import { useSongs } from './useSongs';

const inputClass =
  'h-10 rounded-full border border-border bg-surface-2 text-sm outline-none focus:border-accent';

export function LibraryPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { songs, loading, error } = useSongs();
  const currentId = usePlayerStore((s) => s.queue[s.index]?.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SongSort>('recent');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<Song | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => sortSongs(filterSongs(songs, query), sort), [songs, query, sort]);

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  /** Soft-deletes one or more songs and offers a 5-second undo. */
  const deleteSongs = async (ids: string[], label: string) => {
    if (!uid || ids.length === 0) return;
    setBusy(true);
    try {
      await softDeleteSongs(uid, ids);
      toast.withAction(label, {
        label: 'Undo',
        onClick: () => {
          restoreSongs(uid, ids).catch(() =>
            toast.error("Couldn't undo. Try again from Settings."),
          );
        },
      });
    } catch {
      toast.error("Couldn't delete. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const deleteOne = (song: Song) => deleteSongs([song.id], `Deleted "${song.title}"`);

  const deleteSelected = async () => {
    const ids = [...selected];
    await deleteSongs(ids, ids.length === 1 ? 'Deleted 1 song' : `Deleted ${ids.length} songs`);
    exitSelectMode();
  };

  const subtitle = loading
    ? 'Loading your songs…'
    : `${songs.length} ${songs.length === 1 ? 'song' : 'songs'}`;

  return (
    <>
      <PageHeader
        title="Library"
        subtitle={subtitle}
        actions={
          songs.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            >
              {selectMode ? <X className="size-4" /> : <CheckSquare className="size-4" />}
              {selectMode ? 'Cancel' : 'Select'}
            </Button>
          )
        }
      />

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner label="Loading songs" />
        </div>
      )}

      {!loading && error && (
        <EmptyState
          icon={<Library />}
          title="Couldn't load your library"
          description="Check your connection. Your songs will appear once you're back online."
        />
      )}

      {!loading && !error && songs.length === 0 && (
        <EmptyState
          icon={<Library />}
          title="No songs yet"
          description="Upload your first song to start building your library."
          action={<UploadCta />}
        />
      )}

      {!loading && !error && songs.length > 0 && (
        <div className="px-4 md:px-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="relative min-w-0 flex-1 sm:max-w-xs">
              <span className="sr-only">Filter songs</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter songs"
                className={`${inputClass} w-full pr-4 pl-9`}
              />
            </label>
            <label>
              <span className="sr-only">Sort by</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SongSort)}
                className={`${inputClass} px-3`}
              >
                {(Object.keys(SONG_SORT_LABELS) as SongSort[]).map((key) => (
                  <option key={key} value={key}>
                    {SONG_SORT_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectMode && (
            <div className="sticky top-0 z-10 mb-2 flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <span>{selected.size} selected</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setSelected(new Set(visible.map((s) => s.id)))}
                >
                  Select all
                </Button>
                <Button
                  variant="danger"
                  onClick={deleteSelected}
                  disabled={selected.size === 0 || busy}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}

          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No songs match “{query}”.</p>
          ) : (
            <ul className="space-y-0.5 pb-4">
              {visible.map((song, i) => (
                <SongRow
                  key={song.id}
                  song={song}
                  selectMode={selectMode}
                  selected={selected.has(song.id)}
                  isCurrent={song.id === currentId}
                  isPlaying={isPlaying}
                  onToggleSelected={toggleSelected}
                  onPlay={() => usePlayerStore.getState().playList(visible, i, LIBRARY_SOURCE)}
                  onPlayNext={() => usePlayerStore.getState().playNext(song)}
                  onAddToQueue={() => usePlayerStore.getState().addToQueue(song)}
                  onEdit={setEditing}
                  onDelete={deleteOne}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {editing && (
        <EditSongModal key={editing.id} song={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function UploadCta() {
  const navigate = useNavigate();
  return (
    <Button onClick={() => navigate('/upload')}>
      <Upload className="size-4" aria-hidden />
      Upload your first song
    </Button>
  );
}
