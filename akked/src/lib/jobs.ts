import { db } from './db';
import { isActive } from './plans';
import { trackWorkspace } from './ameexFlow';
import { syncSheet } from './sheets';

let running = { track: false, sheets: false };
const wsRows = (col: string) => db().prepare(`SELECT id, plan, status, period_end FROM workspaces WHERE ${col} IS NOT NULL`).all() as any[];

/** Background jobs: AMEEX status tracking every 3 h, Google Sheets sync every 10 min (only for active subscriptions). */
export function startJobs() {
  if ((process.env.AKKED_DB ?? '') === ':memory:' || process.env.AKKED_NO_JOBS) return;
  const guard = (k: 'track' | 'sheets', fn: () => Promise<void>) => async () => { if (running[k]) return; running[k] = true; try { await fn(); } catch (e) { console.error(k + ' job failed', e); } finally { running[k] = false; } };
  const track = guard('track', async () => { for (const w of wsRows('ameex_api_key_enc')) if (isActive(w)) await trackWorkspace(w.id); });
  const sheets = guard('sheets', async () => { for (const w of wsRows('sheet_url')) if (isActive(w)) await syncSheet(w.id); });
  setInterval(track, 3 * 3600e3).unref(); setInterval(sheets, 10 * 60e3).unref();
  setTimeout(track, 60e3).unref(); setTimeout(sheets, 30e3).unref();
}
