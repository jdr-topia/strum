import clsx from 'clsx';
import { FolderOpen, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { getEnv } from '@/config/env';
import { useAuth } from '@/features/auth/useAuth';
import { useSongs } from '@/features/library/useSongs';
import { AUDIO_EXTENSIONS } from './validateFile';
import { UploadReviewRow } from './UploadReviewRow';
import { useUploadStore, type UploadEdit } from './uploadStore';

const inputClass =
  'h-9 min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 text-sm outline-none focus:border-accent';

export function UploadPage() {
  const { user } = useAuth();
  const items = useUploadStore((s) => s.items);
  const addFiles = useUploadStore((s) => s.addFiles);
  const updateItem = useUploadStore((s) => s.updateItem);
  const applyToPending = useUploadStore((s) => s.applyToPending);
  const removeItem = useUploadStore((s) => s.removeItem);
  const startAll = useUploadStore((s) => s.startAll);
  const retry = useUploadStore((s) => s.retry);
  const clearFinished = useUploadStore((s) => s.clearFinished);

  const { songs: library } = useSongs();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [sharedArtist, setSharedArtist] = useState('');
  const [sharedAlbum, setSharedAlbum] = useState('');

  const pending = items.filter((i) => i.status === 'pending' && !i.reading).length;
  const done = items.filter((i) => i.status === 'done').length;
  const uploading = items.some((i) => i.status === 'uploading' || i.status === 'saving');
  const overall = items.length
    ? Math.round(items.reduce((sum, i) => sum + i.progress, 0) / items.length)
    : 0;

  // Leaving mid-upload would cancel it, so ask first.
  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [uploading]);

  const maxMb = getEnv().maxUploadMb;

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    void addFiles(Array.from(files), maxMb);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    onFiles(e.dataTransfer.files);
  };

  const applyShared = () => {
    const edit: Pick<UploadEdit, 'artist' | 'album'> = {};
    if (sharedArtist.trim()) edit.artist = sharedArtist.trim();
    if (sharedAlbum.trim()) edit.album = sharedAlbum.trim();
    if (Object.keys(edit).length > 0) applyToPending(edit);
  };

  return (
    <>
      <PageHeader title="Upload" subtitle="Add songs from this device" />

      <div className="space-y-6 px-4 pb-6 md:px-8">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={clsx(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors',
            dragging ? 'border-accent bg-surface-2' : 'border-border',
          )}
        >
          <Upload className="size-8 text-muted" aria-hidden />
          <div>
            <p className="font-medium">Drop audio files here</p>
            <p className="text-xs text-muted">
              {AUDIO_EXTENSIONS.join(', ')} · up to {maxMb} MB each
            </p>
          </div>
          <Button variant="secondary" onClick={() => inputRef.current?.click()}>
            <FolderOpen className="size-4" aria-hidden />
            Choose files
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {items.length > 0 && (
          <section aria-label="Songs to upload" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {items.length} {items.length === 1 ? 'song' : 'songs'}
                  {done > 0 && <span className="text-muted"> · {done} added</span>}
                </p>
                {uploading && (
                  <div
                    role="progressbar"
                    aria-label="Overall upload progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={overall}
                    className="mt-1 h-1.5 w-48 overflow-hidden rounded-full bg-surface-2"
                  >
                    <div
                      className="h-full bg-accent transition-[width]"
                      style={{ width: `${overall}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {done > 0 && (
                  <Button variant="ghost" onClick={clearFinished}>
                    Clear finished
                  </Button>
                )}
                <Button
                  onClick={() => user && startAll(user.uid)}
                  disabled={pending === 0 || !user}
                >
                  {pending === 0
                    ? 'Upload'
                    : `Upload ${pending} ${pending === 1 ? 'song' : 'songs'}`}
                </Button>
              </div>
            </div>

            {pending > 1 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface p-3">
                <span className="text-sm text-muted">Apply to all:</span>
                <input
                  aria-label="Shared artist"
                  placeholder="Artist"
                  className={inputClass}
                  value={sharedArtist}
                  onChange={(e) => setSharedArtist(e.target.value)}
                />
                <input
                  aria-label="Shared album"
                  placeholder="Album"
                  className={inputClass}
                  value={sharedAlbum}
                  onChange={(e) => setSharedAlbum(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={applyShared}
                  disabled={!sharedArtist.trim() && !sharedAlbum.trim()}
                >
                  Apply
                </Button>
              </div>
            )}

            <ul className="space-y-2">
              {items.map((item) => (
                <UploadReviewRow
                  key={item.id}
                  item={item}
                  library={library}
                  onEdit={updateItem}
                  onRemove={removeItem}
                  onRetry={retry}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
