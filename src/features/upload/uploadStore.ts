import { create } from 'zustand';
import { toast } from '@/components/toastStore';
import { extractMetadata, titleFromFileName, UNKNOWN_ARTIST } from './extractMetadata';
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
  /** True while tags are being read. The row shows at once; it can't be uploaded until this is false. */
  reading: boolean;
}

export type UploadEdit = Partial<Pick<UploadItem, 'title' | 'artist' | 'album'>>;

/** How many songs upload at the same time. */
export const UPLOAD_CONCURRENCY = 2;

interface UploadState {
  items: UploadItem[];
  /** Set by startAll; the queue needs it to upload. */
  uid: string | null;
  /**
   * Validates files and adds a row for each straight away (filename as the title).
   * Tags are read in the background and fill the rows in when ready.
   */
  addFiles: (files: File[], maxMb: number) => Promise<void>;
  updateItem: (id: string, edit: UploadEdit) => void;
  /** Sets artist and/or album on every item that is ready and hasn't started. */
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

/** Ready to upload: waiting, and its tags have been read. */
const isReadyToUpload = (i: UploadItem) => i.status === 'pending' && !i.reading;

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

  /** Starts ready items until CONCURRENCY uploads are running. */
  function pump() {
    const { uid, items } = get();
    if (!uid) return;

    for (const item of items) {
      if (inFlight.size >= UPLOAD_CONCURRENCY) break;
      if (isReadyToUpload(item) && !inFlight.has(item.id)) run(item, uid);
    }

    if (inFlight.size === 0 && !get().items.some(isReadyToUpload)) {
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

  /** Reads tags for one row and fills it in. Quietly skips rows removed while reading. */
  async function readTags(item: UploadItem) {
    const meta = await extractMetadata(item.file);
    const stillThere = get().items.some((i) => i.id === item.id);
    if (!stillThere) return;
    patch(item.id, {
      title: meta.title,
      artist: meta.artist,
      album: meta.album ?? '',
      durationSec: meta.durationSec,
      cover: meta.cover,
      coverPreviewUrl: meta.cover ? URL.createObjectURL(meta.cover) : null,
      reading: false,
    });
    // An upload batch may already be running and waiting for this row.
    if (get().uid) pump();
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

      const newItems: UploadItem[] = valid.map((file) => ({
        id: `up-${nextId++}`,
        file,
        title: titleFromFileName(file.name),
        artist: UNKNOWN_ARTIST,
        album: '',
        durationSec: 0,
        cover: null,
        coverPreviewUrl: null,
        status: 'pending',
        progress: 0,
        error: null,
        reading: true,
      }));
      set((s) => ({ items: [...s.items, ...newItems] }));

      // Each file reads its own tags; one slow file doesn't hold up the others.
      for (const item of newItems) void readTags(item);
    },

    updateItem: (id, edit) => patch(id, edit),

    applyToPending: (edit) =>
      set((s) => ({
        items: s.items.map((i) => (isReadyToUpload(i) ? { ...i, ...edit } : i)),
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
