/** Extensions accepted even when the browser reports no/odd MIME type (common for .m4a, .flac, .opus). */
export const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'aac', 'ogg', 'opus', 'flac', 'wav'];

export function isAudioFile(file: Pick<File, 'name' | 'type'>): boolean {
  if (file.type.startsWith('audio/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return AUDIO_EXTENSIONS.includes(ext);
}

/** Returns a user-facing problem with the file, or null when it can be uploaded. */
export function validateAudioFile(
  file: Pick<File, 'name' | 'type' | 'size'>,
  maxMb: number,
): string | null {
  if (!isAudioFile(file)) {
    return `"${file.name}" isn't an audio file. Supported: ${AUDIO_EXTENSIONS.join(', ')}.`;
  }
  if (file.size > maxMb * 1024 * 1024) {
    return `"${file.name}" is larger than ${maxMb} MB.`;
  }
  return null;
}
