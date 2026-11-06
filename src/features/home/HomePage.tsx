import { House, Pause, Play, Shuffle, Upload } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Cover } from '@/components/Cover';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { SongRow } from '@/features/library/SongRow';
import { LIBRARY_SOURCE, usePlayerStore } from '@/features/player/playerStore';
import { PlaylistCard } from '@/features/playlists/PlaylistCard';
import { resolvePlaylistSongs } from '@/features/playlists/resolvePlaylistSongs';
import { usePlaylists } from '@/features/playlists/usePlaylists';
import { useSongActions } from '@/features/library/useSongActions';
import { usePlayableSongs } from '@/features/discover/usePublicSongs';
import { useSongs } from '@/features/library/useSongs';
import type { Playlist } from '@/types/playlist';

const RECENT_COUNT = 12;
const PLAYLIST_COUNT = 6;

const updatedMillis = (p: Playlist) => p.updatedAt?.toMillis() ?? 0;

export function HomePage() {
  const navigate = useNavigate();
  const { songs: library, loading: songsLoading } = useSongs();
  // Playlist cards may show friends' public songs too.
  const { songs: playable } = usePlayableSongs();
  const { playlists } = usePlaylists();
  const actions = useSongActions();
  const currentId = usePlayerStore((s) => s.queue[s.index]?.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const queueSong = usePlayerStore((s) => s.queue[s.index] ?? null);
  const source = usePlayerStore((s) => s.source);

  const recent = useMemo(() => library.slice(0, RECENT_COUNT), [library]);
  const recentPlaylists = useMemo(
    () =>
      [...playlists].sort((a, b) => updatedMillis(b) - updatedMillis(a)).slice(0, PLAYLIST_COUNT),
    [playlists],
  );

  if (!songsLoading && library.length === 0) {
    return (
      <>
        <PageHeader title="Home" />
        <EmptyState
          icon={<House />}
          title="Welcome to Strum"
          description="Upload some songs to start your library. Playlists and recent songs will show up here."
          action={
            <Button onClick={() => navigate('/upload')}>
              <Upload className="size-4" aria-hidden />
              Upload songs
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Home"
        actions={
          <Button
            variant="secondary"
            disabled={library.length === 0}
            onClick={() => {
              const store = usePlayerStore.getState();
              if (!store.shuffle) store.toggleShuffle();
              usePlayerStore.getState().playList(library, 0, LIBRARY_SOURCE);
            }}
          >
            <Shuffle className="size-4" aria-hidden />
            Shuffle my library
          </Button>
        }
      />

      <div className="space-y-8 px-4 pb-6 md:px-8">
        {queueSong && (
          <section aria-labelledby="continue-heading">
            <h2
              id="continue-heading"
              className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase"
            >
              Continue listening
            </h2>
            <div className="flex items-center gap-4 rounded-xl bg-surface-2 p-3">
              <Cover
                src={queueSong.coverUrl}
                seed={queueSong.id}
                className="size-14"
                rounded="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{queueSong.title}</p>
                <p className="truncate text-sm text-muted">
                  {queueSong.artist}
                  {source ? ` · ${source.name}` : ''}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => usePlayerStore.getState().togglePlay()}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                {isPlaying ? 'Pause' : 'Resume'}
              </Button>
            </div>
          </section>
        )}

        <section aria-labelledby="recent-heading">
          <h2
            id="recent-heading"
            className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase"
          >
            Recently added
          </h2>
          <ul className="space-y-0.5">
            {recent.map((song, i) => (
              <SongRow
                key={song.id}
                song={song}
                selectMode={false}
                selected={false}
                isCurrent={song.id === currentId}
                isPlaying={isPlaying}
                onToggleSelected={() => undefined}
                onPlay={() => usePlayerStore.getState().playList(recent, i, LIBRARY_SOURCE)}
                onPlayNext={() => usePlayerStore.getState().playNext(song)}
                onAddToQueue={() => usePlayerStore.getState().addToQueue(song)}
                onEdit={actions.editSong}
                onDelete={actions.deleteSong}
                onTogglePublic={() => actions.togglePublic(song)}
                onAddToPlaylist={() => actions.addToPlaylist([song.id])}
              />
            ))}
          </ul>
        </section>

        {recentPlaylists.length > 0 && (
          <section aria-labelledby="playlists-heading">
            <h2
              id="playlists-heading"
              className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase"
            >
              Your playlists
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {recentPlaylists.map((playlist) => (
                <li key={playlist.id}>
                  <PlaylistCard
                    playlist={playlist}
                    songs={resolvePlaylistSongs(playlist.songIds, playable)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {actions.dialogs}
    </>
  );
}
