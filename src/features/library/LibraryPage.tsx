import { CheckSquare, Library, ListPlus, Search, Upload, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Select } from '@/components/Select';
import { PageHeader } from '@/components/PageHeader';
import { Spinner } from '@/components/Spinner';
import { FolderContents } from '@/features/folders/FolderContents';
import { LIBRARY_SOURCE, usePlayerStore } from '@/features/player/playerStore';
import { useSongActions } from './useSongActions';
import { useDeleteSongs } from './useDeleteSongs';
import { SongRow } from './SongRow';
import { filterSongs, SONG_SORT_LABELS, sortSongs, type SongSort } from './sortSongs';
import { useSongs } from './useSongs';

const inputClass =
  'h-10 rounded-full border border-border bg-surface-2 text-sm outline-none focus:border-accent';

type LibraryView = 'songs' | 'playlists';

export function LibraryPage() {
  const { songs, loading, error } = useSongs();
  const currentId = usePlayerStore((s) => s.queue[s.index]?.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view: LibraryView = params.get('view') === 'playlists' ? 'playlists' : 'songs';

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SongSort>('recent');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const { deleteSongs, busy } = useDeleteSongs();
  const actions = useSongActions();

  const visible = useMemo(() => sortSongs(filterSongs(songs, query), sort), [songs, query, sort]);

  const switchView = (next: LibraryView) => {
    setParams(next === 'playlists' ? { view: 'playlists' } : {}, { replace: true });
    exitSelectMode();
  };

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
        subtitle={view === 'songs' ? subtitle : 'Playlists and folders'}
        actions={
          view === 'songs' &&
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

      <div className="px-4 pb-3 md:px-8">
        <div
          role="group"
          aria-label="Library view"
          className="inline-flex rounded-full bg-surface-2 p-1"
        >
          {(['songs', 'playlists'] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => switchView(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                view === key ? 'bg-surface text-fg shadow' : 'text-muted hover:text-fg'
              }`}
            >
              {key === 'songs' ? 'Songs' : 'Playlists'}
            </button>
          ))}
        </div>
      </div>

      {view === 'playlists' && <FolderContents folderId={null} />}

      {view === 'songs' && loading && (
        <div className="flex justify-center py-16">
          <Spinner label="Loading songs" />
        </div>
      )}

      {view === 'songs' && !loading && error && (
        <EmptyState
          icon={<Library />}
          title="Couldn't load your library"
          description="Check your connection. Your songs will appear once you're back online."
        />
      )}

      {view === 'songs' && !loading && !error && songs.length === 0 && (
        <EmptyState
          icon={<Library />}
          title="No songs yet"
          description="Upload your first song to start building your library."
          action={<UploadCta onUpload={() => navigate('/upload')} />}
        />
      )}

      {view === 'songs' && !loading && !error && songs.length > 0 && (
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
            <Select
              pill
              label="Sort by"
              value={sort}
              onChange={setSort}
              options={(Object.keys(SONG_SORT_LABELS) as SongSort[]).map((key) => ({
                value: key,
                label: SONG_SORT_LABELS[key],
              }))}
            />
          </div>

          {selectMode && (
            <div className="sticky top-0 z-10 mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <span>{selected.size} selected</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setSelected(new Set(visible.map((s) => s.id)))}
                >
                  Select all
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => actions.addToPlaylist([...selected])}
                  disabled={selected.size === 0 || busy}
                >
                  <ListPlus className="size-4" aria-hidden />
                  Add to playlist
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
                  onEdit={actions.editSong}
                  onDelete={actions.deleteSong}
                  onAddToPlaylist={() => actions.addToPlaylist([song.id])}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {actions.dialogs}
    </>
  );
}

function UploadCta({ onUpload }: { onUpload: () => void }) {
  return (
    <Button onClick={onUpload}>
      <Upload className="size-4" aria-hidden />
      Upload your first song
    </Button>
  );
}
