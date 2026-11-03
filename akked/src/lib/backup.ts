import fs from 'node:fs';
import path from 'node:path';
import { db } from './db';

const KEEP = 14;
/** Consistent snapshot of the live database (SQLite VACUUM INTO), then prune old snapshots. */
export function backupTo(dir: string, now = new Date()): string {
  fs.mkdirSync(dir, { recursive: true });
  const z = (n: number) => String(n).padStart(2, '0');
  const name = `akked-${now.getUTCFullYear()}${z(now.getUTCMonth() + 1)}${z(now.getUTCDate())}-${z(now.getUTCHours())}${z(now.getUTCMinutes())}${z(now.getUTCSeconds())}.db`;
  const file = path.join(dir, name);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  db().exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  const old = fs.readdirSync(dir).filter((f) => /^akked-\d{8}-\d{6}\.db$/.test(f)).sort().reverse().slice(KEEP);
  for (const f of old) fs.unlinkSync(path.join(dir, f));
  return file;
}

export const backupDir = () => process.env.AKKED_BACKUP_DIR || path.join(process.cwd(), 'data', 'backups');

/** Runs once at start (if the last snapshot is older than 20 h) and then every 6 h. */
export function startBackupScheduler() {
  if ((process.env.AKKED_DB ?? '') === ':memory:') return;
  const run = () => { try { backupTo(backupDir()); } catch (e) { console.error('backup failed', e); } };
  try {
    const dir = backupDir();
    const last = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.startsWith('akked-')).map((f) => fs.statSync(path.join(dir, f)).mtimeMs).sort().pop() : 0;
    if (!last || Date.now() - last > 20 * 3600e3) run();
  } catch { run(); }
  setInterval(run, 6 * 3600e3).unref();
}
