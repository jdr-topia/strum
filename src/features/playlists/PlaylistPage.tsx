import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ListMusic, Play, Plus, Shuffle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { NamePromptModal } from '@/components/NamePromptModal';
import { PageHeader } from '@/components/PageHeader';
import { Spinner } from '@/components/Spinner';
import { toast } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { useSongs } from '@/features/library/useSongs';
import { useSongActions } from '@/features/library/useSongActions';
import { sortSongs, SONG_SORT_LABELS, type SongSort } from '@/features/library/sortSongs';
import { usePlayerStore } from '@/features/player/playerStore';
import { formatTotalDuration } from '@/lib/formatters';
import { friendlyError } from '@/lib/errors';
import type { Song } from '@/types/song';
import { AddSongsDialog } from './AddSongsDialog';
import { playPlaylist } from './playPlaylist';
import { PlaylistActionsMenu } from './PlaylistActionsMenu';
import { PlaylistCover } from './PlaylistCover';
import { reorderSongs, removeSong, setDescription } from './playlistApi';
import { resolvePlaylistSongs, totalDurationSec } from './resolvePlaylistSongs';
import { SortableTrack } from './SortableTrack';
import { usePlaylists } from './usePlaylists';

type TrackSort = 'custom' | SongSort;

const TRACK_SORT_LABELS: Record<TrackSort, string> = {
  custom: 'Custom order',
  ...SONG_SORT_LABELS,
};

const selectClass =
  'h-10 rounded-full border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent';

/** A drag that is still being saved: shown until the playlist's own song list changes. */
interface PendingOrder {
  base: string[];
  order: string[];
}

export function PlaylistPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { playlists, loading: playlistsLoading } = usePlaylists();
  const { songs: library, loading: songsLoading } = useSongs();
  const currentId = usePlayerStore((s) => s.queue[s.index]?.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const actions = useSongActions();

  const [sort, setSort] = useState<TrackSort>('custom');
  const [pending, setPending] = useState<PendingOrder | null>(null);
  const [addingSongs, setAddingSongs] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const playlist = playlists.find((p) => p.id === id);
  const loading = playlistsLoading || songsLoading;

  // Use the pending order only while it belongs to the current playlist data.
  const songs: Song[] = useMemo(() => {
    if (!playlist) return [];
    const ids = pending && pending.base === playlist.songIds ? pending.order : playlist.songIds;
    return resolvePlaylistSongs(ids, library);
  }, [playlist, pending, library]);
  const shown = useMemo(() => (sort === 'custom' ? songs : sortSongs(songs, sort)), [songs, sort]);
  const sortable = sort === 'custom';

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Loading playlist" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <>
        <PageHeader title="Playlist not found" />
        <EmptyState
          icon={<ListMusic />}
          title="This playlist doesn't exist any more"
          action={
            <Button variant="secondary" onClick={() => navigate('/library?view=playlists')}>
              Back to playlists
            </Button>
          }
        />
      </>
    );
  }

  const source = { type: 'playlist' as const, id: playlist.id, name: playlist.name };

  const onDragEnd = (e: DragEndEvent) => {
    if (!uid || !e.over || e.active.id === e.over.id) return;
    const base = playlist.songIds;
    const from = base.indexOf(String(e.active.id));
    const to = base.indexOf(String(e.over.id));
    if (from < 0 || to < 0) return;
    const order = arrayMove(base, from, to);
    setPending({ base, order });
    reorderSongs(uid, playlist.id, order).catch((err: unknown) => {
      setPending(null);
      toast.error(friendlyError(err, "Couldn't save the new order. It has been put back."));
    });
  };

  const removeFromPlaylist = (songId: string, title: string) => {
    if (!uid) return;
    removeSong(uid, playlist.id, songId)
      .then(() => toast.success(`Removed “${title}”`))
      .catch(() => toast.error("Couldn't remove that song. Try again."));
  };

  return (
    <>
      <header className="flex flex-col gap-5 px-4 pt-6 pb-4 md:flex-row md:items-end md:gap-8 md:px-8 md:pt-8">
        <PlaylistCover
          coverUrl={playlist.coverUrl}
          songs={songs}
          seed={playlist.id}
          className="w-40 md:w-52"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Playlist</p>
          <h1 className="mt-1 truncate text-3xl font-bold md:text-4xl">{playlist.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>
              {songs.length} {songs.length === 1 ? 'song' : 'songs'}
              {songs.length > 0 && ` · ${formatTotalDuration(totalDurationSec(songs))}`}
            </span>
          </p>
          {playlist.description ? (
            <p className="mt-2 text-sm text-muted">{playlist.description}</p>
          ) : null}
          <button
            type="button"
            onClick={() => setEditingDescription(true)}
            className="mt-1 text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
          >
            {playlist.description ? 'Edit description' : 'Add a description'}
          </button>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={() => playPlaylist(playlist, songs)} disabled={songs.length === 0}>
              <Play className="size-4" aria-hidden />
              Play
            </Button>
            <Button
              variant="secondary"
              onClick={() => playPlaylist(playlist, songs, { shuffle: true })}
              disabled={songs.length === 0}
            >
              <Shuffle className="size-4" aria-hidden />
              Shuffle
            </Button>
            <Button variant="secondary" onClick={() => setAddingSongs(true)}>
              <Plus className="size-4" aria-hidden />
              Add songs
            </Button>
            <PlaylistActionsMenu
              playlist={playlist}
              onDeleted={() => navigate('/library?view=playlists')}
            />
          </div>
        </div>
      </header>

      {songs.length === 0 ? (
        <EmptyState
          icon={<ListMusic />}
          title="This playlist is empty"
          description="Add songs from your library, or use “Add to playlist” on any song."
          action={
            <Button variant="secondary" onClick={() => setAddingSongs(true)}>
              <Plus className="size-4" aria-hidden />
              Add songs
            </Button>
          }
        />
      ) : (
        <div className="px-4 pb-6 md:px-8">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm text-muted">
              <span>Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as TrackSort)}
                className={selectClass}
              >
                {(Object.keys(TRACK_SORT_LABELS) as TrackSort[]).map((key) => (
                  <option key={key} value={key}>
                    {TRACK_SORT_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            {!sortable && (
              <span className="text-xs text-muted">Switch to custom order to reorder songs</span>
            )}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={shown.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-0.5">
                {shown.map((song, i) => (
                  <SortableTrack
                    key={song.id}
                    song={song}
                    sortable={sortable}
                    selectMode={false}
                    selected={false}
                    isCurrent={song.id === currentId}
                    isPlaying={isPlaying}
                    onToggleSelected={() => undefined}
                    onPlay={() => usePlayerStore.getState().playList(shown, i, source)}
                    onPlayNext={() => usePlayerStore.getState().playNext(song)}
                    onAddToQueue={() => usePlayerStore.getState().addToQueue(song)}
                    onEdit={actions.editSong}
                    onDelete={actions.deleteSong}
                    onAddToPlaylist={() => actions.addToPlaylist([song.id])}
                    onRemoveFromPlaylist={() => removeFromPlaylist(song.id, song.title)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {addingSongs && (
        <AddSongsDialog
          playlist={playlist}
          library={library}
          onClose={() => setAddingSongs(false)}
        />
      )}

      {editingDescription && uid && (
        <NamePromptModal
          open
          onClose={() => setEditingDescription(false)}
          title="Description"
          label="Description (optional)"
          initialValue={playlist.description ?? ''}
          submitLabel="Save"
          onSubmit={(text) => setDescription(uid, playlist.id, text)}
        />
      )}

      {actions.dialogs}
    </>
  );
}
