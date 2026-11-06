/**
 * The single place client code reads configuration from.
 * Values come from Vite's `import.meta.env` (VITE_* vars in .env.local). None are secrets.
 */

export type StreamQuality = '128k' | 'original';

export interface Env {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  cloudinary: {
    cloudName: string;
    uploadPreset: string;
  };
  maxUploadMb: number;
  streamQuality: StreamQuality;
}

export const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_CLOUDINARY_CLOUD_NAME',
  'VITE_CLOUDINARY_UPLOAD_PRESET',
] as const;

/** Cloudinary free plan hard limit per file. */
const MAX_UPLOAD_MB_LIMIT = 100;
const DEFAULT_MAX_UPLOAD_MB = 50;
const DEFAULT_STREAM_QUALITY: StreamQuality = '128k';

export type RawEnv = Record<string, string | boolean | undefined>;

export type EnvResult = { ok: true; env: Env } | { ok: false; problems: string[] };

function str(raw: RawEnv, key: string): string {
  const value = raw[key];
  return typeof value === 'string' ? value.trim() : '';
}

/** Pure validation, so it can be unit-tested and used before anything else loads. */
export function parseEnv(raw: RawEnv): EnvResult {
  const problems: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!str(raw, key)) problems.push(`${key} is missing`);
  }

  let maxUploadMb = DEFAULT_MAX_UPLOAD_MB;
  const maxRaw = str(raw, 'VITE_MAX_UPLOAD_MB');
  if (maxRaw) {
    const n = Number(maxRaw);
    if (!Number.isFinite(n) || n <= 0 || n > MAX_UPLOAD_MB_LIMIT) {
      problems.push(`VITE_MAX_UPLOAD_MB must be a number between 1 and ${MAX_UPLOAD_MB_LIMIT}`);
    } else {
      maxUploadMb = n;
    }
  }

  let streamQuality = DEFAULT_STREAM_QUALITY;
  const qualityRaw = str(raw, 'VITE_STREAM_QUALITY');
  if (qualityRaw) {
    if (qualityRaw === '128k' || qualityRaw === 'original') {
      streamQuality = qualityRaw;
    } else {
      problems.push('VITE_STREAM_QUALITY must be "128k" or "original"');
    }
  }

  if (problems.length > 0) return { ok: false, problems };

  return {
    ok: true,
    env: {
      firebase: {
        apiKey: str(raw, 'VITE_FIREBASE_API_KEY'),
        authDomain: str(raw, 'VITE_FIREBASE_AUTH_DOMAIN'),
        projectId: str(raw, 'VITE_FIREBASE_PROJECT_ID'),
        storageBucket: str(raw, 'VITE_FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: str(raw, 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
        appId: str(raw, 'VITE_FIREBASE_APP_ID'),
      },
      cloudinary: {
        cloudName: str(raw, 'VITE_CLOUDINARY_CLOUD_NAME'),
        uploadPreset: str(raw, 'VITE_CLOUDINARY_UPLOAD_PRESET'),
      },
      maxUploadMb,
      streamQuality,
    },
  };
}

export class EnvError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`Strum is missing configuration:\n- ${problems.join('\n- ')}`);
    this.name = 'EnvError';
    this.problems = problems;
  }
}

let cached: Env | undefined;

/** Validated env. Throws EnvError if invalid — main.tsx checks first and shows an error screen. */
export function getEnv(): Env {
  if (cached) return cached;
  const result = parseEnv(import.meta.env);
  if (!result.ok) throw new EnvError(result.problems);
  cached = result.env;
  return cached;
}
