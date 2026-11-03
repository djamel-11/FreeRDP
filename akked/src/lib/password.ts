import crypto from 'node:crypto';

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
}
export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = (stored ?? '').split(':');
  if (!salt || !hash) return false;
  const h = crypto.scryptSync(pw, salt, 64);
  const s = Buffer.from(hash, 'hex');
  return s.length === h.length && crypto.timingSafeEqual(h, s);
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
/** One-time recovery code shown at signup (our "forgot password" without email infrastructure). */
export function generateRecoveryCode(): string {
  const b = crypto.randomBytes(12);
  const raw = Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join('');
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}
export const normalizeRecoveryCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');
export function tempPassword(): string {
  return Array.from(crypto.randomBytes(10), (x) => ALPHABET[x % ALPHABET.length]).join('');
}
