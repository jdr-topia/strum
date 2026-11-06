import { ListMusic } from 'lucide-react';
import { Cover } from '@/components/Cover';
import type { Song } from '@/types/song';

interface PlaylistCoverProps {
  /** Custom cover; when absent, a 2×2 mosaic of the first songs' covers. */
  coverUrl: string | null;
  /** The first songs of the playlist (up to four are used). */
  songs: Song[];
  seed: string;
  className?: string;
}

/** Square playlist artwork. */
export function PlaylistCover({ coverUrl, songs, seed, className }: PlaylistCoverProps) {
  if (coverUrl) {
    return <Cover src={coverUrl} seed={seed} rounded="md" className={className} />;
  }
  if (songs.length === 0) {
    return (
      <div
        className={`relative flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2 ${className ?? ''}`}
      >
        <ListMusic className="size-1/3 text-muted" aria-hidden />
      </div>
    );
  }
  const tiles = songs.slice(0, 4);
  return (
    <div
      className={`grid aspect-square shrink-0 grid-cols-2 gap-px overflow-hidden rounded-lg bg-surface-2 ${className ?? ''}`}
    >
      {tiles.map((song) => (
        <Cover key={song.id} src={song.coverUrl} seed={song.id} className="w-full" />
      ))}
    </div>
  );
}
