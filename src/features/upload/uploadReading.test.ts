import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractMetadata } from './extractMetadata';
import { uploadSong } from './uploadSong';
import { useUploadStore } from './uploadStore';

vi.mock('./uploadSong', () => ({
  uploadSong: vi.fn(),
  SAVE_FAILED_MESSAGE: 'save failed',
}));

vi.mock('./extractMetadata', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./extractMetadata')>()),
  extractMetadata: vi.fn(),
}));

const flush = () => new Promise((r) => setTimeout(r, 0));
const mp3 = (name: string) => new File(['x'], name, { type: 'audio/mpeg' });
const store = () => useUploadStore.getState();

beforeEach(() => {
  useUploadStore.setState({ items: [], uid: null });
  vi.mocked(uploadSong).mockReset();
  vi.mocked(uploadSong).mockResolvedValue(undefined);
});

describe('upload rows while tags are read', () => {
  it('shows the row at once with the filename, and fills in tags later', async () => {
    let finish!: (v: Awaited<ReturnType<typeof extractMetadata>>) => void;
    vi.mocked(extractMetadata).mockImplementationOnce(
      () => new Promise((resolve) => (finish = resolve)),
    );

    await store().addFiles([mp3('01 Halo.mp3')], 50);
    expect(store().items).toHaveLength(1);
    expect(store().items[0]).toMatchObject({ title: '01 Halo', reading: true });

    finish({ title: 'Halo', artist: 'Beyonce', album: null, durationSec: 215, cover: null });
    await flush();
    expect(store().items[0]).toMatchObject({
      title: 'Halo',
      artist: 'Beyonce',
      durationSec: 215,
      reading: false,
    });
  });

  it('does not upload a row whose tags are still being read', async () => {
    let finish!: (v: Awaited<ReturnType<typeof extractMetadata>>) => void;
    vi.mocked(extractMetadata).mockImplementationOnce(
      () => new Promise((resolve) => (finish = resolve)),
    );

    await store().addFiles([mp3('a.mp3')], 50);
    store().startAll('u1');
    expect(uploadSong).not.toHaveBeenCalled();

    finish({ title: 'A', artist: 'B', album: null, durationSec: 1, cover: null });
    await flush();
    expect(uploadSong).toHaveBeenCalledTimes(1);
  });
});
