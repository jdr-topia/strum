/** 32 characters: no 0, O, 1 or I, so codes read clearly when typed or spoken. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 12;
const WELL_FORMED = new RegExp(`^[${ALPHABET}]{${INVITE_CODE_LENGTH}}$`);

/** Random code from the browser's crypto source. 32 divides 256, so every character is equally likely. */
export function generateInviteCode(): string {
  const bytes = new Uint8Array(INVITE_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = '';
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

/** Cleans typed input: upper case, spaces and dashes removed. */
export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isWellFormedInviteCode(code: string): boolean {
  return WELL_FORMED.test(code);
}

/** "ABCDEFGHJKLM" → "ABCD-EFGH-JKLM", for showing and reading out. */
export function formatInviteCode(code: string): string {
  return code.match(/.{1,4}/g)?.join('-') ?? code;
}
