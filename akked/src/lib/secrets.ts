import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/** AES-256-GCM for per-seller API keys. Set AKKED_SECRET (long random string) in production. */
function masterKey(): Buffer {
  let secret = process.env.AKKED_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') throw new Error('AKKED_SECRET must be set in production');
    const f = path.join(process.cwd(), 'data', 'dev-secret.key');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
    secret = fs.readFileSync(f, 'utf8');
  }
  return crypto.scryptSync(secret, 'akked-v1', 32);
}
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', masterKey(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
}
export function decrypt(blob: string): string {
  const [iv, tag, enc] = blob.split('.').map((s) => Buffer.from(s, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', masterKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}
