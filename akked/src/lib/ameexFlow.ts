import { db } from './db';
import { decrypt } from './secrets';
import { AMEEX_BASE, sendParcel, type AmeexCreds } from './ameex';
import { ameexCityId, changeStatus, getOrder } from './orders';

export type SendError = 'notfound' | 'notconfirmed' | 'already' | 'nocreds' | 'nocity' | 'noaddress' | 'fail';
export const ameexCreds = (wsId: number): AmeexCreds | null => {
  const w = db().prepare('SELECT ameex_api_id, ameex_api_key_enc FROM workspaces WHERE id = ?').get(wsId) as any;
  return w?.ameex_api_id && w?.ameex_api_key_enc ? { apiId: w.ameex_api_id, apiKey: decrypt(w.ameex_api_key_enc) } : null;
};

/** Send ONE confirmed order to AMEEX; on success saves the parcel code and moves the order to "shipped". */
export async function sendOrderToAmeex(wsId: number, userId: number | null, id: number, fetchImpl: typeof fetch = fetch): Promise<{ ok: boolean; error?: SendError }> {
  const o = getOrder(wsId, id);
  if (!o) return { ok: false, error: 'notfound' };
  if (o.status !== 'confirmed') return { ok: false, error: 'notconfirmed' };
  if (o.ameex_parcel_code) return { ok: false, error: 'already' };
  const creds = ameexCreds(wsId); if (!creds) return { ok: false, error: 'nocreds' };
  const cityId = ameexCityId(o.city || ''); if (cityId == null) return { ok: false, error: 'nocity' };
  if (!String(o.address ?? '').trim()) { db().prepare('UPDATE orders SET ameex_error = ? WHERE id = ?').run('address_required', id); return { ok: false, error: 'noaddress' }; }
  const r = await sendParcel(creds, { ...o, address: o.address, city: o.city || '', notes: o.notes || '', products: o.products || '', size: o.size || '', color: o.color || '' }, cityId, fetchImpl);
  if (!r.ok) { db().prepare('UPDATE orders SET ameex_error = ? WHERE id = ?').run(`${r.error}: ${r.raw ?? ''}`.slice(0, 300), id); return { ok: false, error: 'fail' }; }
  db().prepare('UPDATE orders SET ameex_parcel_code = ?, ameex_error = ? WHERE id = ?').run(r.parcelCode ?? 'SENT', r.parcelCode ? null : `no_code: ${r.raw ?? ''}`.slice(0, 300), id);
  changeStatus(wsId, userId, id, 'shipped');
  return { ok: true };
}

/** Send every confirmed, not-yet-sent order (max 50 per click), sequentially. */
export async function bulkSendToAmeex(wsId: number, userId: number | null, fetchImpl: typeof fetch = fetch) {
  const ids = (db().prepare(`SELECT id FROM orders WHERE workspace_id = ? AND status = 'confirmed' AND ameex_parcel_code IS NULL ORDER BY id LIMIT 50`).all(wsId) as any[]).map((r) => r.id as number);
  const out = { sent: 0, failed: [] as { id: number; order_number: string; error: SendError }[] };
  for (const id of ids) {
    const r = await sendOrderToAmeex(wsId, userId, id, fetchImpl);
    if (r.ok) out.sent++; else out.failed.push({ id, order_number: getOrder(wsId, id)?.order_number ?? '', error: r.error! });
    if (r.error === 'nocreds') break;
  }
  return out;
}

// ---------- status tracking ----------
/** AMEEX's public docs don't list status names, so this is keyword-based and conservative: unknown → no change (raw text is kept). */
export function mapAmeexStatus(raw: string | null | undefined): 'delivered' | 'returned' | null {
  const s = (raw ?? '').toLowerCase();
  if (!s) return null;
  if (/retour|return|refus|مرتجع|رفض|non\s*livr|undeliver|not\s*deliver/.test(s)) return 'returned';
  if (/livr[ée]|deliver|تسليم|تم التوصيل/.test(s)) return 'delivered';
  return null;
}
export function extractStatusText(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const stack: any[] = [body];
  while (stack.length) {
    const cur = stack.pop();
    for (const [k, v] of Object.entries(cur)) {
      if (/^(status|statut|state|etat|état|status_name|statusname)$/i.test(k)) {
        if (typeof v === 'string' && v) return v;
        if (v && typeof v === 'object') { const n = (v as any).name ?? (v as any).label ?? (v as any).title; if (typeof n === 'string' && n) return n; }
      }
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  return null;
}

export async function trackParcel(creds: AmeexCreds, code: string, fetchImpl: typeof fetch = fetch): Promise<{ ok: boolean; status?: string }> {
  try {
    const res = await fetchImpl(`${AMEEX_BASE}/Delivery/Parcels/Info?ParcelCode=${encodeURIComponent(code)}`, { headers: { 'C-Api-Id': creds.apiId, 'C-Api-Key': creds.apiKey }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { ok: false };
    const text = await res.text(); let json: any = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { ok: true, status: extractStatusText(json) ?? undefined };
  } catch { return { ok: false }; }
}

/** Update shipped orders from AMEEX: delivered/returned are applied, anything else only refreshes the raw status. */
export async function trackWorkspace(wsId: number, fetchImpl: typeof fetch = fetch, limit = 100) {
  const creds = ameexCreds(wsId); const out = { checked: 0, delivered: 0, returned: 0 };
  if (!creds) return out;
  const rows = db().prepare(`SELECT id, ameex_parcel_code FROM orders WHERE workspace_id = ? AND status = 'shipped' AND ameex_parcel_code IS NOT NULL AND ameex_parcel_code <> 'SENT' ORDER BY COALESCE(ameex_checked_at, '') ASC LIMIT ?`).all(wsId, limit) as any[];
  for (const r of rows) {
    const t = await trackParcel(creds, r.ameex_parcel_code, fetchImpl); out.checked++;
    if (!t.ok) continue;
    db().prepare(`UPDATE orders SET ameex_status = COALESCE(?, ameex_status), ameex_checked_at = CURRENT_TIMESTAMP WHERE id = ?`).run(t.status ?? null, r.id);
    const m = mapAmeexStatus(t.status);
    if (m) { changeStatus(wsId, null, r.id, m, null, 'auto: AMEEX ' + t.status); out[m]++; }
  }
  return out;
}
