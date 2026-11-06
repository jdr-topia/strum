import { getEnv, type StreamQuality } from './env';

export type ResourceType = 'video' | 'image';

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  streamQuality: StreamQuality;
}

function defaultConfig(): CloudinaryConfig {
  const env = getEnv();
  return { ...env.cloudinary, streamQuality: env.streamQuality };
}

/** Audio is uploaded as resource_type=video (Cloudinary's type for audio); covers as image. */
export function UPLOAD_URL(resourceType: ResourceType, config = defaultConfig()): string {
  return `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`;
}

/** Streaming URL. 128k = transcoded MP3 (saves bandwidth); original = the uploaded file. */
export function streamUrl(publicId: string, config = defaultConfig()): string {
  const base = `https://res.cloudinary.com/${config.cloudName}/video/upload`;
  return config.streamQuality === 'original'
    ? `${base}/${publicId}`
    : `${base}/br_128k,f_mp3/${publicId}.mp3`;
}

/** Square, auto-format cover image. */
export function coverUrl(publicId: string, size: number, config = defaultConfig()): string {
  const px = Math.max(1, Math.round(size));
  return `https://res.cloudinary.com/${config.cloudName}/image/upload/c_fill,w_${px},h_${px},f_auto,q_auto/${publicId}`;
}
