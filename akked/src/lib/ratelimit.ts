import { db } from './db';
const WINDOW = 15 * 60e3;
/** Simple failure counter (per key, 15 min window) to slow down password guessing. */
export function tooMany(key: string, max = 8, now = Date.now()): boolean {
  const r = db().prepare('SELECT n, first_at FROM login_fails WHERE key = ?').get(key) as any;
  if (!r) return false;
  if (now - r.first_at > WINDOW) { db().prepare('DELETE FROM login_fails WHERE key = ?').run(key); return false; }
  return r.n >= max;
}
export function recordFail(key: string, now = Date.now()) {
  const r = db().prepare('SELECT n, first_at FROM login_fails WHERE key = ?').get(key) as any;
  if (!r || now - r.first_at > WINDOW) db().prepare('INSERT OR REPLACE INTO login_fails (key, n, first_at) VALUES (?,1,?)').run(key, now);
  else db().prepare('UPDATE login_fails SET n = n + 1 WHERE key = ?').run(key);
}
export const clearFails = (key: string) => void db().prepare('DELETE FROM login_fails WHERE key = ?').run(key);
