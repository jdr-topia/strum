import { Mic2, Play, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Cover } from '@/components/Cover';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { useSongActions } from '@/features/library/useSongActions';
import { SongRow } from '@/features/library/SongRow';
import { useSongs } from '@/features/library/useSongs';
import { usePlaylists } from '@/features/playlists/usePlaylists';
import { PlaylistCover } from '@/features/playlists/PlaylistCover';
import { usePlayerStore } from '@/features/player/playerStore';
import { resolvePlaylistSongs } from '@/features/playlists/resolvePlaylistSongs';
import { normalizeText } from '@/lib/keywords';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import type { Song } from '@/types/song';
import { clearRecentSearches, loadRecentSearches, rememberSearch } from './recentSearches';
import { buildSearchIndex, runSearch } from './searchEngine';

/** Result caps per group. The song cap shows a note; there is no paging yet. */
const SONG_LIMIT = 50;
const GROUP_LIMIT = 8;

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const artistParam = params.get('artist');
  const albumParam = params.get('album');

  const { songs: library, loading } = useSongs();
  const { playlists } = usePlaylists();
  const currentId = usePlayerStore((s) => s.queue[s.index]?.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const actions = useSongActions();

  const [input, setInput] = useState(query);
  const [recent, setRecent] = useState<string[]>(loadRecentSearches);
  const debounced = useDebouncedValue(input, 200);

  // The URL follows the typed text (after the 200 ms pause) so results can be linked and go back.
  useEffect(() => {
    if (debounced === query) return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debounced.trim()) next.set('q', debounced);
        else next.delete('q');
        next.delete('artist');
        next.delete('album');
        return next;
      },
      { replace: true },
    );
  }, [debounced, query, setParams]);

  const index = useMemo(() => buildSearchIndex(library), [library]);
  const results = useMemo(() => runSearch(index, playlists, query), [index, playlists, query]);
  const source = { type: 'search' as const, name: `Search “${query}”` };

  const remember = (text: string) => setRecent((prev) => rememberSearch(prev, text));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    remember(input);
  };

  const browse = (kind: 'artist' | 'album', name: string, artist?: string) => {
    remember(query);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('artist');
      next.delete('album');
      next.set(kind, name);
      if (kind === 'album' && artist) next.set('artist', artist);
      return next;
    });
  };

  const backToResults = () =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('artist');
      next.delete('album');
      return next;
    });

  const rowsFor = (list: Song[]) =>
    list.map((song, i) => (
      <SongRow
        key={song.id}
        song={song}
        selectMode={false}
        selected={false}
        isCurrent={song.id === currentId}
        isPlaying={isPlaying}
        onToggleSelected={() => undefined}
        onPlay={() => usePlayerStore.getState().playList(list, i, source)}
        onPlayNext={() => usePlayerStore.getState().playNext(song)}
        onAddToQueue={() => usePlayerStore.getState().addToQueue(song)}
        onEdit={actions.editSong}
        onDelete={actions.deleteSong}
        onAddToPlaylist={() => actions.addToPlaylist([song.id])}
      />
    ));

  // ---- browse an artist or album -------------------------------------------------------
  if (artistParam || albumParam) {
    const albumKey = albumParam ? normalizeText(albumParam) : null;
    const artistKey = normalizeText(artistParam ?? albumParam ?? '');
    const artistOfAlbum = albumParam ? normalizeText(artistParam ?? '') : null;
    const songs = library.filter((s) =>
      albumKey
        ? normalizeText(s.album ?? '') === albumKey &&
          (artistOfAlbum ? normalizeText(s.artist) === artistOfAlbum : true)
        : normalizeText(s.artist) === artistKey,
    );
    const title = albumParam ?? artistParam ?? '';
    const browseSource = { type: 'search' as const, name: title };

    return (
      <>
        <PageHeader
          title={title}
          subtitle={`${songs.length} ${songs.length === 1 ? 'song' : 'songs'}`}
        />
        <div className="flex flex-wrap items-center gap-3 px-4 pb-4 md:px-8">
          <Button
            onClick={() => usePlayerStore.getState().playList(songs, 0, browseSource)}
            disabled={songs.length === 0}
          >
            <Play className="size-4" aria-hidden />
            Play all
          </Button>
          <Button variant="ghost" onClick={backToResults}>
            Back to results
          </Button>
        </div>
        <ul className="space-y-0.5 px-4 pb-6 md:px-8">{rowsFor(songs)}</ul>
        {actions.dialogs}
      </>
    );
  }

  // ---- search form and results ----------------------------------------------------------
  const hasQuery = query.trim().length > 0;
  const noResults =
    hasQuery &&
    results.songs.length === 0 &&
    results.artists.length === 0 &&
    results.albums.length === 0 &&
    results.playlists.length === 0;

  return (
    <>
      <PageHeader title="Search" />
      <form onSubmit={submit} role="search" className="px-4 pb-4 md:px-8">
        <label className="relative block max-w-xl">
          <span className="sr-only">Search songs, artists, albums and playlists</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Songs, artists, albums, playlists"
            className="h-11 w-full rounded-full border border-border bg-surface-2 pr-4 pl-10 text-sm outline-none focus:border-accent"
          />
        </label>
      </form>

      {!hasQuery && (
        <section className="px-4 md:px-8">
          {recent.length > 0 ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold tracking-wider text-muted uppercase">
                  Recent searches
                </h2>
                <Button
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    clearRecentSearches();
                    setRecent([]);
                  }}
                >
                  Clear
                </Button>
              </div>
              <ul className="space-y-0.5">
                {recent.map((text) => (
                  <li key={text} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInput(text)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
                    >
                      <Search className="size-4 text-muted" aria-hidden />
                      <span className="truncate">{text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyState
              icon={<Search />}
              title="Search your library"
              description="Find songs, artists, albums and playlists."
            />
          )}
        </section>
      )}

      {hasQuery && loading && <p className="px-4 text-sm text-muted md:px-8">Loading…</p>}

      {hasQuery && !loading && noResults && (
        <EmptyState
          icon={<Search />}
          title={`Nothing matches “${query}”`}
          description="Check the spelling, or try a shorter word."
        />
      )}

      {hasQuery && !loading && !noResults && (
        <div className="space-y-8 px-4 pb-6 md:px-8">
          {results.songs.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">
                Songs
              </h2>
              <ul className="space-y-0.5">
                {rowsFor(results.songs.slice(0, SONG_LIMIT).map((h) => h.song))}
              </ul>
              {results.songs.length > SONG_LIMIT && (
                <p className="mt-2 text-xs text-muted">
                  Showing the top {SONG_LIMIT} of {results.songs.length} songs. Narrow your search
                  to see more.
                </p>
              )}
            </section>
          )}

          {results.artists.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">
                Artists
              </h2>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {results.artists.slice(0, GROUP_LIMIT).map((artist) => (
                  <li key={artist.name}>
                    <button
                      type="button"
                      onClick={() => browse('artist', artist.name)}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-2"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2">
                        <Mic2 className="size-5 text-muted" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{artist.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {artist.count} {artist.count === 1 ? 'song' : 'songs'}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.albums.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">
                Albums
              </h2>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {results.albums.slice(0, GROUP_LIMIT).map((album) => (
                  <li key={`${album.name}|${album.artist}`}>
                    <button
                      type="button"
                      onClick={() => browse('album', album.name, album.artist)}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-2"
                    >
                      <Cover
                        src={album.sample.coverUrl}
                        seed={album.sample.id}
                        className="size-10"
                        rounded="md"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{album.name}</span>
                        <span className="block truncate text-xs text-muted">{album.artist}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.playlists.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">
                Playlists
              </h2>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {results.playlists.slice(0, GROUP_LIMIT).map(({ playlist }) => (
                  <li key={playlist.id}>
                    <NavLink
                      to={`/playlist/${playlist.id}`}
                      onClick={() => remember(query)}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-2"
                    >
                      <PlaylistCover
                        coverUrl={playlist.coverUrl}
                        songs={resolvePlaylistSongs(playlist.songIds.slice(0, 4), library)}
                        seed={playlist.id}
                        className="size-10"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{playlist.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {playlist.songIds.length} songs
                        </span>
                      </span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {actions.dialogs}
    </>
  );
}
