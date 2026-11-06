/** Simple deterministic string hash (FNV-1a, 32-bit). */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A stable two-colour gradient for a seed (e.g. a song or playlist id), used when there is no cover. */
export function gradientFor(seed: string): string {
  const hash = hashString(seed);
  const hue1 = hash % 360;
  const hue2 = (hue1 + 40 + ((hash >>> 9) % 80)) % 360;
  return `linear-gradient(135deg, hsl(${hue1} 65% 45%), hsl(${hue2} 70% 25%))`;
}
