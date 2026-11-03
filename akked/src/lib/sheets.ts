import crypto from 'node:crypto';
import { db } from './db';
import { createOrders } from './orders';
import { parseOrders } from './import';

/** Google Sheets without OAuth: the seller shares the sheet ("anyone with the link can view"); we read its CSV export. */
export const SHEETS_BASE = () => process.env.SHEETS_BASE_URL || 'https://docs.google.com';

export function parseSheetUrl(url: string): { id: string; gid: string } | null {
  let u: URL; try { u = new URL(url.trim()); } catch { return null; }
  if (u.protocol !== 'https:' || u.hostname !== 'docs.google.com') return null;      // strict allow-list: no SSRF to other hosts
  const m = u.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/); if (!m) return null;
  const gid = (u.hash.match(/gid=(\d+)/) ?? u.search.match(/gid=(\d+)/))?.[1] ?? '0';
  return { id: m[1], gid };
}

const rowHash = (r: { customer_name: string; phone: string; products: string; price: number; city: string }, nth: number) =>
  crypto.createHash('sha1').update([r.phone, r.customer_name.toLowerCase(), r.products.toLowerCase(), r.price, r.city.toLowerCase(), nth].join('|')).digest('hex');

export interface SyncResult { ok: boolean; added: number; skipped: number; invalid: number; error?: string }

/** Import only rows not seen before. Identical rows are told apart by their n-th occurrence, so re-sorting the sheet doesn't duplicate orders. */
export async function syncSheet(wsId: number, fetchImpl: typeof fetch = fetch, now = new Date()): Promise<SyncResult> {
  const w = db().prepare('SELECT sheet_url FROM workspaces WHERE id = ?').get(wsId) as any;
  const ref = w?.sheet_url ? parseSheetUrl(w.sheet_url) : null;
  const save = (r: SyncResult) => { db().prepare('UPDATE workspaces SET sheet_last_sync = ?, sheet_last_result = ? WHERE id = ?').run(now.toISOString(), r.ok ? `ok +${r.added}` : `error: ${r.error}`, wsId); return r; };
  if (!ref) return save({ ok: false, added: 0, skipped: 0, invalid: 0, error: 'url' });
  let text: string;
  try {
    const res = await fetchImpl(`${SHEETS_BASE()}/spreadsheets/d/${ref.id}/export?format=csv&gid=${ref.gid}`, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    const host = new URL(res.url || SHEETS_BASE()).hostname;
    if (!res.ok || !(host.endsWith('google.com') || host.endsWith('googleusercontent.com') || process.env.SHEETS_BASE_URL)) return save({ ok: false, added: 0, skipped: 0, invalid: 0, error: 'access' });
    const ct = res.headers.get('content-type') ?? '';
    if (ct && !/csv|text\/plain|octet-stream/.test(ct)) return save({ ok: false, added: 0, skipped: 0, invalid: 0, error: 'not_shared' });
    text = (await res.text()).slice(0, 2_000_000);
  } catch { return save({ ok: false, added: 0, skipped: 0, invalid: 0, error: 'network' }); }
  const { rows, errors } = parseOrders(text);
  const seen = new Set((db().prepare('SELECT h FROM sheet_seen WHERE workspace_id = ?').all(wsId) as any[]).map((r) => r.h as string));
  const count = new Map<string, number>(); const fresh: typeof rows = []; const hashes: string[] = [];
  for (const r of rows) {
    const base = rowHash(r, 0).slice(0, 12) + r.phone; const n = (count.get(base) ?? 0) + 1; count.set(base, n);
    const h = rowHash(r, n); if (seen.has(h)) continue; fresh.push(r); hashes.push(h);
  }
  if (!fresh.length) return save({ ok: true, added: 0, skipped: rows.length, invalid: errors.length });
  const c = createOrders(wsId, null, fresh, 'sheet', now);
  if (c.error) return save({ ok: false, added: 0, skipped: rows.length, invalid: errors.length, error: c.error });
  const ins = db().prepare('INSERT OR IGNORE INTO sheet_seen (workspace_id, h) VALUES (?, ?)');
  db().transaction(() => { for (const h of hashes) ins.run(wsId, h); })();
  return save({ ok: true, added: fresh.length, skipped: rows.length - fresh.length, invalid: errors.length });
}
