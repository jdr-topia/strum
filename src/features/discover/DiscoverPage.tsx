import { Compass, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Select } from '@/components/Select';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { SongRow } from '@/features/library/SongRow';
import { useSongActions } from '@/features/library/useSongActions';
import { useSongVisibility } from '@/features/library/useSongVisibility';
import { usePlayerStore } from '@/features/player/playerStore';
import type { PlaySource } from '@/types/player';
import {
  DISCOVER_SORT_LABELS,
  discoverSongs,
  type DiscoverFilter,
  type DiscoverSort,
} from './publicSongs';
import { usePublicSongs } from './usePublicSongs';

const DISCOVER_SOURCE: PlaySource = { type: 'discover', name: 'Discover' };

const FILTER_LABELS: Record<DiscoverFilter, string> = {
  everyone: 'Everyone',
  others: 'Friends',
  mine: 'Mine',
};

const inputClass =
  'h-10 rounded-full border border-border bg-surface-2 text-sm outline-none focus:border-accent';

/**
 * Songs that any Strum user made public. Anyone can play, queue and add them to their own
 * playlists; only the owner can make one private again (editing stays in their Library).
 */
export function DiscoverPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { songs, loading, error } = usePublicSongs();
  const currentId = usePlayerStore((s) => s.queue[s.index]?.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const actions = useSongActions();
  const { setPublic } = useSongVisibility();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<DiscoverSort>('recent');
  const [filter, setFilter] = useState<DiscoverFilter>('everyone');

  const visible = useMemo(
    () => discoverSongs(songs, { query, sort, filter, uid }),
    [songs, query, sort, filter, uid],
  );

  const subtitle = loading
    ? 'Loading shared songs…'
    : `${songs.length} ${songs.length === 1 ? 'song' : 'songs'} shared by friends`;

  return (
    <>
      <PageHeader title="Discover" subtitle={subtitle} />

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner label="Loading shared songs" />
        </div>
      )}

      {!loading && error && (
        <EmptyState
          icon={<Compass />}
          title="Couldn't load Discover"
          description="Check your connection. Shared songs will appear once you're back online."
        />
      )}

      {!loading && !error && songs.length === 0 && (
        <EmptyState
          icon={<Compass />}
          title="Nothing shared yet"
          description="Make a song public from your Library (⋮ → Make public) and your friends can find it here."
        />
      )}

      {!loading && !error && songs.length > 0 && (
        <div className="px-4 md:px-8">
          <div
            role="group"
            aria-label="Shared by"
            className="mb-3 inline-flex rounded-full bg-surface-2 p-1"
          >
            {(Object.keys(FILTER_LABELS) as DiscoverFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                  filter === key ? 'bg-surface text-fg shadow' : 'text-muted hover:text-fg'
                }`}
              >
                {FILTER_LABELS[key]}
              </button>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="relative min-w-0 flex-1 sm:max-w-xs">
              <span className="sr-only">Filter shared songs</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Song, artist or friend"
                className={`${inputClass} w-full pr-4 pl-9`}
              />
            </label>
            <Select
              pill
              label="Sort by"
              value={sort}
              onChange={setSort}
              options={(Object.keys(DISCOVER_SORT_LABELS) as DiscoverSort[]).map((key) => ({
                value: key,
                label: DISCOVER_SORT_LABELS[key],
              }))}
            />
          </div>

          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              {query ? `No shared songs match “${query}”.` : 'No songs here yet.'}
            </p>
          ) : (
            <ul className="space-y-0.5 pb-4">
              {visible.map((song, i) => {
                const mine = song.owner.uid === uid;
                return (
                  <SongRow
                    key={song.id}
                    song={song}
                    selectMode={false}
                    selected={false}
                    isCurrent={song.id === currentId}
                    isPlaying={isPlaying}
                    onToggleSelected={() => undefined}
                    onPlay={() => usePlayerStore.getState().playList(visible, i, DISCOVER_SOURCE)}
                    onPlayNext={() => usePlayerStore.getState().playNext(song)}
                    onAddToQueue={() => usePlayerStore.getState().addToQueue(song)}
                    onAddToPlaylist={() => actions.addToPlaylist([song.id])}
                    onTogglePublic={mine ? () => void setPublic([song], false) : undefined}
                    byline={mine ? 'Shared by you' : `Shared by ${song.owner.name}`}
                  />
                );
              })}
            </ul>
          )}
        </div>
      )}

      {actions.dialogs}
    </>
  );
}
