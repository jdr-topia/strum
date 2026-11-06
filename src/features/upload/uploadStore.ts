import { create } from 'zustand';
import { toast } from '@/components/toastStore';
import { extractMetadata } from './extractMetadata';
import { uploadSong, SAVE_FAILED_MESSAGE } from './uploadSong';
import { validateAudioFile } from './validateFile';

export type UploadStatus = 'pending' | 'uploading' | 'saving' | 'done' | 'error';

export interface UploadItem {
  id: string;
  file: File;
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  cover: Blob | null;
  coverPreviewUrl: string | null;
  status: UploadStatus;
  progress: number;
  error: string | null;
}

export type UploadEdit = Partial<Pick<UploadItem, 'title' | 'artist' | 'album'>>;

/** How many songs upload at the same time. */
export const UPLOAD_CONCURRENCY = 2;

interface UploadState {
  items: UploadItem[];
  /** Set by startAll; the queue needs it to upload. */
  uid: string | null;
  /** Validates, reads tags and adds reviewable items. Invalid files get a toast. */
  addFiles: (files: File[], maxMb: number) => Promise<void>;
  updateItem: (id: string, edit: UploadEdit) => void;
  /** Sets artist and/or album on every item that hasn't started. */
  applyToPending: (edit: Pick<UploadEdit, 'artist' | 'album'>) => void;
  removeItem: (id: string) => void;
  startAll: (uid: string) => void;
  retry: (id: string) => void;
  clearFinished: () => void;
}

// Module-level bookkeeping that doesn't belong in the React-visible state.
const controllers = new Map<string, AbortController>();
const inFlight = new Set<string>();
let completedInBatch = 0;
let nextId = 1;

const revokePreview = (item: UploadItem | undefined) => {
  if (item?.coverPreviewUrl) URL.revokeObjectURL(item.coverPreviewUrl);
};

export const useUploadStore = create<UploadState>((set, get) => {
  const patch = (id: string, change: Partial<UploadItem>) =>
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...change } : i)) }));

  const removeById = (id: string) => {
    controllers.get(id)?.abort();
    const item = get().items.find((i) => i.id === id);
    revokePreview(item);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  };

  function run(item: UploadItem, uid: string) {
    const controller = new AbortController();
    controllers.set(item.id, controller);
    inFlight.add(item.id);
    patch(item.id, { status: 'uploading', progress: 0, error: null });

    uploadSong(
      uid,
      {
        file: item.file,
        title: item.title,
        artist: item.artist,
        album: item.album,
        durationSec: item.durationSec,
        cover: item.cover,
      },
      {
        signal: controller.signal,
        onProgress: (pct) => patch(item.id, { progress: pct }),
        onSaving: () => patch(item.id, { status: 'saving', progress: 100 }),
      },
    )
      .then(() => {
        completedInBatch++;
        revokePreview(get().items.find((i) => i.id === item.id));
        patch(item.id, { status: 'done', progress: 100 });
      })
      .catch((err: unknown) => {
        // Cancelled rows were already removed by removeById.
        if (controller.signal.aborted) return;
        const message = err instanceof Error && err.message ? err.message : SAVE_FAILED_MESSAGE;
        patch(item.id, { status: 'error', error: message });
      })
      .finally(() => {
        controllers.delete(item.id);
        inFlight.delete(item.id);
        pump();
      });
  }

  /** Starts pending items until CONCURRENCY uploads are running. */
  function pump() {
    const { uid, items } = get();
    if (!uid) return;

    for (const item of items) {
      if (inFlight.size >= UPLOAD_CONCURRENCY) break;
      if (item.status === 'pending' && !inFlight.has(item.id)) run(item, uid);
    }

    if (inFlight.size === 0 && !get().items.some((i) => i.status === 'pending')) {
      if (completedInBatch > 0) {
        toast.success(
          completedInBatch === 1
            ? '1 song added to your library'
            : `${completedInBatch} songs added to your library`,
        );
        completedInBatch = 0;
      }
    }
  }

  return {
    items: [],
    uid: null,

    addFiles: async (files, maxMb) => {
      const valid: File[] = [];
      for (const file of files) {
        const problem = validateAudioFile(file, maxMb);
        if (problem) toast.error(problem);
        else valid.push(file);
      }
      if (valid.length === 0) return;

      const metas = await Promise.all(valid.map((file) => extractMetadata(file)));
      const newItems: UploadItem[] = valid.map((file, i) => {
        const meta = metas[i];
        return {
          id: `up-${nextId++}`,
          file,
          title: meta.title,
          artist: meta.artist,
          album: meta.album ?? '',
          durationSec: meta.durationSec,
          cover: meta.cover,
          coverPreviewUrl: meta.cover ? URL.createObjectURL(meta.cover) : null,
          status: 'pending',
          progress: 0,
          error: null,
        };
      });
      set((s) => ({ items: [...s.items, ...newItems] }));
      // If an upload batch is already running, new files join the queue straight away.
      if (get().uid) pump();
    },

    updateItem: (id, edit) => patch(id, edit),

    applyToPending: (edit) =>
      set((s) => ({
        items: s.items.map((i) => (i.status === 'pending' ? { ...i, ...edit } : i)),
      })),

    removeItem: (id) => removeById(id),

    startAll: (uid) => {
      completedInBatch = 0;
      set({ uid });
      pump();
    },

    retry: (id) => {
      patch(id, { status: 'pending', progress: 0, error: null });
      pump();
    },

    clearFinished: () => {
      const finished = get().items.filter((i) => i.status === 'done');
      finished.forEach((i) => revokePreview(i));
      set((s) => ({ items: s.items.filter((i) => i.status !== 'done') }));
    },
  };
});

/** Items still waiting for or in the middle of an upload. */
export function activeUploadCount(items: UploadItem[]): number {
  return items.filter(
    (i) => i.status === 'pending' || i.status === 'uploading' || i.status === 'saving',
  ).length;
}
