import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { toPublicSong, type PublicSong } from './publicSongs';

/** Discover loads at most this many songs (newest shared first). Enough for a friends' app. */
const MAX_PUBLIC_SONGS = 1000;

/** Live list of every public song, from all users. Writes go through `songApi`. */
export function subscribePublicSongs(
  onNext: (songs: PublicSong[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, 'publicSongs'),
    orderBy('sharedAt', 'desc'),
    limit(MAX_PUBLIC_SONGS),
  );
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => toPublicSong(d.id, d.data()))),
    (err) => onError(err),
  );
}
