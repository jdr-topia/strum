import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '@/components/toastStore';
import { uploadSong } from './uploadSong';
import { UPLOAD_CONCURRENCY, useUploadStore } from './uploadStore';

vi.mock('./uploadSong', () => ({
  uploadSong: vi.fn(),
  SAVE_FAILED_MESSAGE: "Couldn't save the song to your library. Please try again.",
}));

vi.mock('./extractMetadata', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./extractMetadata')>()),
  extractMetadata: vi.fn(async () => ({
    title: 'Song',
    artist: 'Artist',
    album: null,
    durationSec: 120,
    cover: null,
  })),
}));

const mp3 = (name: string) => new File(['x'], name, { type: 'audio/mpeg' });

function deferred() {
  let resolve!: () => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets pending promise callbacks and the store's queue run. */
const flush = () => new Promise((r) => setTimeout(r, 0));

const store = () => useUploadStore.getState();

/** Adds files, then waits for the background tag reads to finish. */
const addFiles = async (files: File[], maxMb = 50) => {
  await store().addFiles(files, maxMb);
  await flush();
};

beforeEach(() => {
  useUploadStore.setState({ items: [], uid: null });
  useToastStore.setState({ toasts: [] });
  vi.mocked(uploadSong).mockReset();
  vi.mocked(uploadSong).mockResolvedValue(undefined);
});

describe('uploadStore', () => {
  it('rejects non-audio files with a toast and keeps the valid ones', async () => {
    await addFiles([new File(['x'], 'a.png', { type: 'image/png' }), mp3('a.mp3')], 50);

    expect(store().items.map((i) => i.file.name)).toEqual(['a.mp3']);
    expect(useToastStore.getState().toasts[0].message).toMatch(/isn't an audio file/);
  });

  it('reads tags into editable items', async () => {
    await addFiles([mp3('a.mp3')], 50);
    expect(store().items[0]).toMatchObject({ title: 'Song', artist: 'Artist', durationSec: 120 });
  });

  it('uploads at most UPLOAD_CONCURRENCY songs at once and finishes the rest', async () => {
    const calls = [deferred(), deferred(), deferred()];
    let n = 0;
    vi.mocked(uploadSong).mockImplementation(() => calls[n++].promise);

    await addFiles([mp3('1.mp3'), mp3('2.mp3'), mp3('3.mp3')], 50);
    store().startAll('u1');
    expect(uploadSong).toHaveBeenCalledTimes(UPLOAD_CONCURRENCY);

    calls[0].resolve();
    await flush();
    expect(uploadSong).toHaveBeenCalledTimes(3);

    calls[1].resolve();
    calls[2].resolve();
    await flush();
    expect(store().items.every((i) => i.status === 'done')).toBe(true);
  });

  it('marks a failed song as error and can retry it', async () => {
    vi.mocked(uploadSong).mockRejectedValueOnce(new Error('Network problem.'));
    await addFiles([mp3('a.mp3')], 50);
    store().startAll('u1');
    await flush();

    const id = store().items[0].id;
    expect(store().items[0]).toMatchObject({ status: 'error', error: 'Network problem.' });

    store().retry(id);
    await flush();
    expect(store().items[0].status).toBe('done');
    expect(uploadSong).toHaveBeenCalledTimes(2);
  });

  it('removes a pending item without uploading it', async () => {
    await addFiles([mp3('a.mp3')], 50);
    const id = store().items[0].id;
    store().removeItem(id);
    store().startAll('u1');
    await flush();
    expect(store().items).toHaveLength(0);
    expect(uploadSong).not.toHaveBeenCalled();
  });

  it('applies artist/album only to items that have not started', async () => {
    await addFiles([mp3('a.mp3')], 50);
    store().applyToPending({ artist: 'Shared', album: 'Album X' });
    expect(store().items[0]).toMatchObject({ artist: 'Shared', album: 'Album X' });
  });

  it('clearFinished keeps unfinished items', async () => {
    await addFiles([mp3('a.mp3'), mp3('b.mp3')], 50);
    store().updateItem(store().items[0].id, {});
    useUploadStore.setState((s) => ({
      items: s.items.map((i, idx) => (idx === 0 ? { ...i, status: 'done' as const } : i)),
    }));
    store().clearFinished();
    expect(store().items.map((i) => i.file.name)).toEqual(['b.mp3']);
  });
});
