// Excludes ambiguous chars: I, O, 0, 1
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_REGEX = /^[A-HJ-NP-Z]{4}-[A-HJ-NP-Z2-9]{4}$/;

function randomChars(chars: string, len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function generateGameCode(): string {
  return `${randomChars(ALPHA, 4)}-${randomChars(ALNUM, 4)}`;
}

export function isValidGameCode(code: string): boolean {
  return CODE_REGEX.test(code);
}

export function normalizeGameCode(code: string): string {
  return code.trim().toUpperCase();
}
