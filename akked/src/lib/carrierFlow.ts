import { db } from './db';
import { CONNECTORS } from './connectors';
import { getCarrier, getCreds, listCarriers, resolveCity } from './carriers';
import { changeStatus, getOrder } from './orders';

export type SendError = 'notfound' | 'notconfirmed' | 'already' | 'nocarrier' | 'noconnector' | 'nocreds' | 'nocity' | 'noaddress' | 'fail';

/** Send ONE confirmed order through a carrier's API; on success saves the parcel code, remembers the carrier and moves the order to "shipped". */
export async function sendOrderViaCarrier(wsId: number, userId: number | null, id: number, carrierId: number, fetchImpl: typeof fetch = fetch): Promise<{ ok: boolean; error?: SendError }> {
  const o = getOrder(wsId, id); if (!o) return { ok: false, error: 'notfound' };
  if (o.status !== 'confirmed') return { ok: false, error: 'notconfirmed' };
  if (o.parcel_code) return { ok: false, error: 'already' };
  const carrier = getCarrier(wsId, carrierId); if (!carrier) return { ok: false, error: 'nocarrier' };
  const conn = carrier.connector ? CONNECTORS[carrier.connector] : null; if (!conn) return { ok: false, error: 'noconnector' };
  const creds = getCreds(wsId, carrierId); if (!creds || conn.fields.some((f) => !creds[f.key])) return { ok: false, error: 'nocreds' };
  const city = resolveCity(carrier, o.city || '');
  if (conn.needsCityId && !city.id) return { ok: false, error: 'nocity' };
  if (conn.requiresAddress && !String(o.address ?? '').trim()) { db().prepare('UPDATE orders SET carrier_error = ? WHERE id = ?').run('address_required', id); return { ok: false, error: 'noaddress' }; }
  const r = await conn.send(creds, { ...o, id, address: o.address ?? '', city: o.city || '', notes: o.notes || '', products: o.products || '', size: o.size || '', color: o.color || '' }, city, fetchImpl);
  if (!r.ok) { db().prepare('UPDATE orders SET carrier_error = ? WHERE id = ?').run(`${r.error}: ${r.raw ?? ''}`.slice(0, 300), id); return { ok: false, error: 'fail' }; }
  db().prepare('UPDATE orders SET parcel_code = ?, carrier_id = ?, carrier_error = ? WHERE id = ?').run(r.code ?? 'SENT', carrierId, r.code ? null : `no_code: ${r.raw ?? ''}`.slice(0, 300), id);
  changeStatus(wsId, userId, id, 'shipped');
  return { ok: true };
}

/** Send every confirmed, not-yet-sent order through this carrier (max 50 per click), sequentially. */
export async function bulkSend(wsId: number, userId: number | null, carrierId: number, fetchImpl: typeof fetch = fetch) {
  const ids = (db().prepare(`SELECT id FROM orders WHERE workspace_id = ? AND status = 'confirmed' AND parcel_code IS NULL ORDER BY id LIMIT 50`).all(wsId) as any[]).map((r) => r.id as number);
  const out = { sent: 0, failed: [] as { id: number; order_number: string; error: SendError }[] };
  for (const id of ids) {
    const r = await sendOrderViaCarrier(wsId, userId, id, carrierId, fetchImpl);
    if (r.ok) out.sent++; else out.failed.push({ id, order_number: getOrder(wsId, id)?.order_number ?? '', error: r.error! });
    if (r.error === 'nocreds' || r.error === 'nocarrier' || r.error === 'noconnector') break;
  }
  return out;
}

/** Update shipped orders from each carrier that supports tracking: delivered/returned are applied, anything else only refreshes the raw status. */
export async function trackWorkspace(wsId: number, fetchImpl: typeof fetch = fetch, limit = 100) {
  const out = { checked: 0, delivered: 0, returned: 0 };
  for (const carrier of listCarriers(wsId)) {
    const conn = carrier.connector ? CONNECTORS[carrier.connector] : null; if (!conn?.track) continue;
    const creds = getCreds(wsId, carrier.id); if (!creds) continue;
    const rows = db().prepare(`SELECT id, parcel_code FROM orders WHERE workspace_id = ? AND carrier_id = ? AND status = 'shipped' AND parcel_code IS NOT NULL AND parcel_code <> 'SENT' ORDER BY COALESCE(carrier_checked_at, '') ASC LIMIT ?`).all(wsId, carrier.id, limit) as any[];
    for (const r of rows) {
      const t = await conn.track(creds, r.parcel_code, fetchImpl); out.checked++;
      if (!t.ok) continue;
      db().prepare(`UPDATE orders SET carrier_status = COALESCE(?, carrier_status), carrier_checked_at = CURRENT_TIMESTAMP WHERE id = ?`).run(t.status ?? null, r.id);
      const m = conn.mapStatus(t.status);
      if (m) { changeStatus(wsId, null, r.id, m, null, `auto: ${carrier.name} ${t.status}`); out[m]++; }
    }
  }
  return out;
}
