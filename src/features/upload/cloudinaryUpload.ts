import { UPLOAD_URL, type ResourceType } from '@/config/cloudinary';
import { getEnv } from '@/config/env';

/** Subset of Cloudinary's upload response that we store. */
export interface CloudinaryResult {
  public_id: string;
  secure_url: string;
  bytes: number;
  duration?: number;
  format: string;
  /** Present when the upload preset has "Return delete token" enabled. Valid ~10 minutes. */
  delete_token?: string;
}

export interface UploadOptions {
  resourceType: ResourceType;
  folder: string;
  /** Multipart filename sent to Cloudinary. */
  filename: string;
  /** Tags stored with the asset (e.g. "strum", the uid). */
  tags: string[];
  /** Key/value context (title, artist) so assets are readable in the Cloudinary console. */
  context: Record<string, string>;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}

/** Cloudinary context values are `key=value` pairs separated by `|`, so strip those characters. */
export function encodeContext(context: Record<string, string>): string {
  return Object.entries(context)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}=${v.replace(/[|=]/g, ' ').trim().slice(0, 200)}`)
    .join('|');
}

interface CloudinaryErrorBody {
  error?: { message?: string };
}

/** Maps Cloudinary responses to friendly, actionable messages. */
export function friendlyUploadError(status: number, message?: string, maxMb?: number): string {
  const msg = (message ?? '').toLowerCase();
  if (status === 0) return 'Network problem. Check your connection and try again.';
  if (msg.includes('file size too large') || status === 413) {
    return maxMb ? `That file is too large. The limit is ${maxMb} MB.` : 'That file is too large.';
  }
  if (msg.includes('extension') || msg.includes('format') || msg.includes('not allowed')) {
    return "That file type isn't supported.";
  }
  if (status === 401 || status === 403) {
    return 'Uploads are blocked right now. Check the Cloudinary upload preset settings.';
  }
  if (status >= 500) return 'Cloudinary is having trouble. Please try again in a moment.';
  return 'Upload failed. Please try again.';
}

/** Uploads a Blob with XHR so we get progress events and can abort. */
export function uploadToCloudinary(file: Blob, opts: UploadOptions): Promise<CloudinaryResult> {
  const env = getEnv();
  const form = new FormData();
  form.append('file', file, opts.filename);
  form.append('upload_preset', env.cloudinary.uploadPreset);
  form.append('folder', opts.folder);
  form.append('tags', opts.tags.join(','));
  const context = encodeContext(opts.context);
  if (context) form.append('context', context);

  return new Promise<CloudinaryResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => opts.signal?.removeEventListener('abort', abort);

    xhr.open('POST', UPLOAD_URL(opts.resourceType));
    opts.signal?.addEventListener('abort', abort, { once: true });

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      cleanup();
      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) {
        resolve(body as CloudinaryResult);
        return;
      }
      const message = (body as CloudinaryErrorBody | null)?.error?.message;
      reject(new Error(friendlyUploadError(xhr.status, message, env.maxUploadMb)));
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error(friendlyUploadError(0)));
    };

    xhr.onabort = () => {
      cleanup();
      reject(new DOMException('Upload cancelled', 'AbortError'));
    };

    xhr.send(form);
  });
}

/**
 * Removes an asset that was uploaded but never saved to Firestore.
 * Uses the delete token from the upload response, so no API secret is needed.
 * Never throws; returns false if it couldn't be removed.
 */
export async function deleteByToken(token: string): Promise<boolean> {
  try {
    const form = new FormData();
    form.append('token', token);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${getEnv().cloudinary.cloudName}/delete_by_token`,
      { method: 'POST', body: form },
    );
    return res.ok;
  } catch {
    return false;
  }
}
