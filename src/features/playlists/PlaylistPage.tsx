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
import { Select } from '@/components/Select';
import { NamePromptModal } from '@/components/NamePromptModal';
import { PageHeader } from '@/components/PageHeader';
import { Spinner } from '@/components/Spinner';
import { toast } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { isOwnSong, unavailableIds } from '@/features/discover/publicSongs';
import { usePlayableSongs } from '@/features/discover/usePublicSongs';
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
  const { songs: library, loading: librarySongsLoading } = useSongs();
  // Own songs plus friends' public songs: a playlist may hold both.
  const { songs: playable, loading: playableLoading } = usePlayableSongs();
  const songsLoading = librarySongsLoading || playableLoading;
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
    return resolvePlaylistSongs(ids, playable);
  }, [playlist, pending, playable]);
  // Friends' songs that were deleted or made private since they were added.
  const missingIds = useMemo(
    () => (playlist ? unavailableIds(playlist.songIds, playable) : []),
    [playlist, playable],
  );
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

  const removeUnavailable = () => {
    if (!uid || missingIds.length === 0) return;
    const keep = playlist.songIds.filter((songId) => !missingIds.includes(songId));
    reorderSongs(uid, playlist.id, keep)
      .then(() => toast.success('Removed songs that are no longer available'))
      .catch(() => toast.error("Couldn't update the playlist. Try again."));
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
          <h1 className="mt-1 line-clamp-2 text-3xl font-bold break-words md:line-clamp-none md:truncate md:text-4xl">
            {playlist.name}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>
              {songs.length} {songs.length === 1 ? 'song' : 'songs'}
              {songs.length > 0 && ` · ${formatTotalDuration(totalDurationSec(songs))}`}
            </span>
          </p>
          {missingIds.length > 0 && (
            <p className="mt-1 text-xs text-muted">
              {missingIds.length === 1
                ? '1 song is no longer available (deleted or made private by its owner). '
                : `${missingIds.length} songs are no longer available (deleted or made private by their owners). `}
              <button
                type="button"
                onClick={removeUnavailable}
                className="font-medium text-fg underline-offset-4 hover:underline"
              >
                Remove {missingIds.length === 1 ? 'it' : 'them'}
              </button>
            </p>
          )}
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
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>Sort</span>
              <Select
                pill
                label="Sort tracks"
                value={sort}
                onChange={setSort}
                options={(Object.keys(TRACK_SORT_LABELS) as TrackSort[]).map((key) => ({
                  value: key,
                  label: TRACK_SORT_LABELS[key],
                }))}
              />
            </div>
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
                    onEdit={isOwnSong(song, uid) ? actions.editSong : undefined}
                    onDelete={isOwnSong(song, uid) ? actions.deleteSong : undefined}
                    onTogglePublic={
                      isOwnSong(song, uid) ? () => actions.togglePublic(song) : undefined
                    }
                    byline={isOwnSong(song, uid) ? undefined : `Shared by ${song.owner?.name}`}
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
