/** Where the current queue came from, shown as "Playing from …". */
export interface PlaySource {
  type: 'library' | 'playlist' | 'search' | 'discover';
  id?: string;
  name: string;
}

export type RepeatMode = 'off' | 'all' | 'one';
