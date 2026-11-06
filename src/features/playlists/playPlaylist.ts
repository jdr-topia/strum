import { toast } from '@/components/toastStore';
import { usePlayerStore } from '@/features/player/playerStore';
import type { Playlist } from '@/types/playlist';
import type { Song } from '@/types/song';

/**
 * Starts a playlist in the player with the playlist as the queue source.
 * `shuffle` turns shuffle on (plain play keeps the current shuffle setting).
 */
export function playPlaylist(
  playlist: Pick<Playlist, 'id' | 'name'>,
  songs: Song[],
  options: { shuffle?: boolean } = {},
): void {
  if (songs.length === 0) {
    toast.info('This playlist has no songs to play yet.');
    return;
  }
  const store = usePlayerStore.getState();
  if (options.shuffle && !store.shuffle) store.toggleShuffle();
  usePlayerStore
    .getState()
    .playList(songs, 0, { type: 'playlist', id: playlist.id, name: playlist.name });
}
