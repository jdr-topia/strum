import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/toastStore';
import { uploadToCloudinary } from '@/features/upload/cloudinaryUpload';
import { useAuth } from '@/features/auth/useAuth';
import { ownerNameFor } from '@/features/discover/publicSongs';
import type { Song } from '@/types/song';
import { updateSongInfo } from './songApi';

interface EditSongModalProps {
  song: Song;
  onClose: () => void;
}

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent';
const labelClass = 'mb-1 block text-xs font-medium text-muted';

/**
 * Edit title/artist/album, optionally replace the cover, and share or unshare in Discover.
 * Parent should pass `key={song.id}` so the form resets for each song.
 */
export function EditSongModal({ song, onClose }: EditSongModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [album, setAlbum] = useState(song.album ?? '');
  const [isPublic, setIsPublic] = useState(song.isPublic);
  const [newCover, setNewCover] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickCover = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file for the cover.');
      return;
    }
    setError(null);
    setNewCover(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cleanTitle = title.trim();
    if (!cleanTitle || cleanTitle.length > 200) {
      setError('Title is required (up to 200 characters).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let coverPublicId = song.coverPublicId;
      let coverUrl = song.coverUrl;
      if (newCover) {
        const uploaded = await uploadToCloudinary(newCover, {
          resourceType: 'image',
          folder: `strum/covers/${user.uid}`,
          filename: 'cover',
          tags: ['strum', user.uid],
          context: { title: cleanTitle, artist: artist.trim() },
        });
        coverPublicId = uploaded.public_id;
        coverUrl = uploaded.secure_url;
      }
      await updateSongInfo({ uid: user.uid, name: ownerNameFor(user) }, song, {
        title: cleanTitle,
        artist: artist.trim() || 'Unknown Artist',
        album: album.trim() || null,
        coverPublicId,
        coverUrl,
        isPublic,
      });
      toast.success('Song updated');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={saving ? () => undefined : onClose}
      title="Edit song"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-song-form" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="edit-song-form" onSubmit={save} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
            {(previewUrl ?? song.coverUrl) ? (
              <img
                src={previewUrl ?? song.coverUrl ?? ''}
                alt=""
                className="size-full object-cover"
              />
            ) : null}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm font-medium text-accent hover:underline"
            >
              Replace cover
            </button>
            <p className="text-xs text-muted">JPG, PNG or WebP</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickCover(e.target.files?.[0])}
            />
          </div>
        </div>

        <label className="block">
          <span className={labelClass}>Title</span>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block">
          <span className={labelClass}>Artist</span>
          <input
            className={inputClass}
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Album</span>
          <input className={inputClass} value={album} onChange={(e) => setAlbum(e.target.value)} />
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-3">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-accent"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">Public</span>
            <span className="block text-xs text-muted">
              Friends on Strum can find and play it in Discover, and add it to their playlists. They
              see your name, not your email.
            </span>
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
