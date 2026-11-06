import { NavLink } from 'react-router-dom';
import { PlaylistActionsMenu } from './PlaylistActionsMenu';
import { PlaylistCover } from './PlaylistCover';
import type { Playlist } from '@/types/playlist';
import type { Song } from '@/types/song';

interface PlaylistCardProps {
  playlist: Playlist;
  /** The playlist's songs that are still in the library, in playlist order. */
  songs: Song[];
}

/** Grid card linking to a playlist, with its actions menu in the corner. */
export function PlaylistCard({ playlist, songs }: PlaylistCardProps) {
  const count = songs.length;
  return (
    <div className="group relative">
      <NavLink
        to={`/playlist/${playlist.id}`}
        className="block rounded-xl p-2 transition-colors hover:bg-surface-2"
      >
        <PlaylistCover
          coverUrl={playlist.coverUrl}
          songs={songs}
          seed={playlist.id}
          className="w-full"
        />
        <p className="mt-2 truncate text-sm font-medium">{playlist.name}</p>
        <p className="truncate text-xs text-muted">
          {count} {count === 1 ? 'song' : 'songs'}
        </p>
      </NavLink>
      <div className="absolute top-3 right-3">
        <PlaylistActionsMenu
          playlist={playlist}
          triggerClassName="bg-black/50 text-white hover:bg-black/70 hover:text-white"
        />
      </div>
    </div>
  );
}
