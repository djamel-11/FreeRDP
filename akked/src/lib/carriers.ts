import fs from 'node:fs';
import path from 'node:path';
import { db } from './db';
import { decrypt, encrypt } from './secrets';
import { CONNECTORS } from './connectors';
import { canonicalCity, cityKey } from './cities';
import type { ExportConfig, ExportRow } from './exportEngine';
import type { ExportOrder } from './exporters';

export interface Carrier { id: number; workspace_id: number; name: string; connector: string | null; config: ExportConfig; has_template: boolean; template_name: string | null; has_creds: boolean }
const EMPTY: ExportConfig = { headerRow: 1, columns: [], output: 'xlsx' };
const mapRow = (r: any): Carrier => ({ id: r.id, workspace_id: r.workspace_id, name: r.name, connector: r.connector, config: safeJson(r.config), has_template: !!r.has_template, template_name: r.template_name, has_creds: !!r.creds_enc });
function safeJson(s: string): ExportConfig { try { const c = JSON.parse(s); return c && Array.isArray(c.columns) ? c : EMPTY; } catch { return EMPTY; } }

const migrated = new Set<number>();
/** Seller had AMEEX credentials from the earlier single-carrier version → turn them into a carrier profile once. */
function migrateLegacy(wsId: number) {
  if (migrated.has(wsId)) return; migrated.add(wsId);
  try {
    const w = db().prepare('SELECT ameex_api_id, ameex_api_key_enc FROM workspaces WHERE id = ?').get(wsId) as any;
    if (!w?.ameex_api_id || !w?.ameex_api_key_enc) return;
    if (db().prepare(`SELECT 1 FROM carriers WHERE workspace_id = ? AND connector = 'ameex'`).get(wsId)) return;
    const id = createFromPreset(wsId, 'ameex', { apiId: w.ameex_api_id, apiKey: decrypt(w.ameex_api_key_enc) });
    db().prepare(`UPDATE orders SET carrier_id = ? WHERE workspace_id = ? AND carrier_id IS NULL AND parcel_code IS NOT NULL`).run(id, wsId);
  } catch (e) { console.error('legacy carrier migration failed', e); }
}

const COLS = `id, workspace_id, name, connector, creds_enc, config, template_name, (template IS NOT NULL) AS has_template`;
export function listCarriers(wsId: number): Carrier[] {
  migrateLegacy(wsId);
  return (db().prepare(`SELECT ${COLS} FROM carriers WHERE workspace_id = ? ORDER BY id`).all(wsId) as any[]).map(mapRow);
}
export function getCarrier(wsId: number, id: number): Carrier | null {
  migrateLegacy(wsId);
  const r = db().prepare(`SELECT ${COLS} FROM carriers WHERE workspace_id = ? AND id = ?`).get(wsId, id) as any;
  return r ? mapRow(r) : null;
}
export const getTemplate = (wsId: number, id: number): Uint8Array | null => {
  const r = db().prepare('SELECT template FROM carriers WHERE workspace_id = ? AND id = ?').get(wsId, id) as any; return r?.template ? new Uint8Array(r.template) : null;
};

export function createCarrier(wsId: number, i: { name: string; connector?: string | null; creds?: Record<string, string> | null; config?: ExportConfig; template?: Uint8Array | null; templateName?: string | null }): number {
  const r = db().prepare(`INSERT INTO carriers (workspace_id, name, connector, creds_enc, config, template, template_name) VALUES (?,?,?,?,?,?,?)`)
    .run(wsId, i.name.trim().slice(0, 60), i.connector ?? null, i.creds ? encrypt(JSON.stringify(i.creds)) : null, JSON.stringify(i.config ?? EMPTY), i.template ?? null, i.templateName ?? null);
  return Number(r.lastInsertRowid);
}

/** Built-in connector with its own template mapping (e.g. AMEEX). */
export function createFromPreset(wsId: number, connectorKey: string, creds: Record<string, string> | null): number {
  const c = CONNECTORS[connectorKey]; if (!c) throw new Error('unknown connector');
  let template: Uint8Array | null = null;
  if (c.presetTemplate) { try { template = new Uint8Array(fs.readFileSync(path.join(process.cwd(), 'templates', c.presetTemplate.file))); } catch { template = null; } }
  return createCarrier(wsId, { name: c.name, connector: c.key, creds, config: c.presetTemplate?.config, template, templateName: c.presetTemplate?.file ?? null });
}

export const setConfig = (wsId: number, id: number, cfg: ExportConfig) => void db().prepare('UPDATE carriers SET config = ? WHERE workspace_id = ? AND id = ?').run(JSON.stringify(cfg), wsId, id);
export const setTemplate = (wsId: number, id: number, bytes: Uint8Array | null, name: string | null) =>
  void db().prepare('UPDATE carriers SET template = ?, template_name = ? WHERE workspace_id = ? AND id = ?').run(bytes, name, wsId, id);
export const renameCarrier = (wsId: number, id: number, name: string) => void db().prepare('UPDATE carriers SET name = ? WHERE workspace_id = ? AND id = ?').run(name.trim().slice(0, 60), wsId, id);
export function setCreds(wsId: number, id: number, creds: Record<string, string>, keepEmptySecrets = true) {
  const cur = getCreds(wsId, id) ?? {}; const next: Record<string, string> = { ...cur };
  for (const [k, v] of Object.entries(creds)) if (v || !keepEmptySecrets) next[k] = v.trim();
  db().prepare('UPDATE carriers SET creds_enc = ? WHERE workspace_id = ? AND id = ?').run(encrypt(JSON.stringify(next)), wsId, id);
}
export function getCreds(wsId: number, id: number): Record<string, string> | null {
  const r = db().prepare('SELECT creds_enc FROM carriers WHERE workspace_id = ? AND id = ?').get(wsId, id) as any;
  if (!r?.creds_enc) return null; try { return JSON.parse(decrypt(r.creds_enc)); } catch { return null; }
}
export function deleteCarrier(wsId: number, id: number) {
  const d = db();
  d.transaction(() => { d.prepare('DELETE FROM carrier_cities WHERE carrier_id IN (SELECT id FROM carriers WHERE workspace_id = ? AND id = ?)').run(wsId, id); d.prepare('UPDATE orders SET carrier_id = NULL WHERE workspace_id = ? AND carrier_id = ?').run(wsId, id); d.prepare('DELETE FROM carriers WHERE workspace_id = ? AND id = ?').run(wsId, id); })();
}

// ---------- city lists ("id,name" or just "name" per line) ----------
export function parseCityList(text: string): { id: string | null; name: string }[] {
  const out: { id: string | null; name: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const l = line.trim(); if (!l) continue;
    let m = l.match(/^(\d+)\s*[,;\t]\s*(.+)$/); if (m) { out.push({ id: m[1], name: m[2].trim() }); continue; }
    m = l.match(/^(.+?)\s*[,;\t]\s*(\d+)$/); if (m) { out.push({ id: m[2], name: m[1].trim() }); continue; }
    out.push({ id: null, name: l });
  }
  return out;
}
export function setCities(wsId: number, carrierId: number, text: string): { saved: number; unmatched: string[] } {
  const c = getCarrier(wsId, carrierId); if (!c) return { saved: 0, unmatched: [] };
  const items = parseCityList(text).slice(0, 5000); const d = db(); const unmatched: string[] = [];
  d.transaction(() => {
    d.prepare('DELETE FROM carrier_cities WHERE carrier_id = ?').run(carrierId);
    const ins = d.prepare('INSERT OR REPLACE INTO carrier_cities (carrier_id, canonical, carrier_city_id, carrier_city_name) VALUES (?,?,?,?)');
    for (const it of items) {
      const canon = canonicalCity(it.name);
      if (canon) ins.run(carrierId, canon, it.id, it.name); else { unmatched.push(it.name); ins.run(carrierId, 'raw:' + cityKey(it.name), it.id, it.name); } // still usable when the order spells it exactly like the carrier does
    }
  })();
  return { saved: items.length, unmatched };
}
export const citiesText = (carrierId: number) =>
  (db().prepare('SELECT carrier_city_id id, carrier_city_name name FROM carrier_cities WHERE carrier_id = ? ORDER BY name').all(carrierId) as any[]).map((r) => (r.id ? `${r.id},${r.name}` : r.name)).join('\n');
export const cityCount = (carrierId: number) => (db().prepare('SELECT COUNT(*) c FROM carrier_cities WHERE carrier_id = ?').get(carrierId) as any).c as number;

/** Which name/id the carrier wants for an order's city. matched=false means "we can't be sure" (shown as a warning). */
export function resolveCity(carrier: Carrier, cityName: string): { id: string; name: string; matched: boolean } {
  const canon = canonicalCity(cityName);
  const q = db().prepare('SELECT carrier_city_id id, carrier_city_name name FROM carrier_cities WHERE carrier_id = ? AND canonical = ?');
  const row = ((canon && q.get(carrier.id, canon)) || q.get(carrier.id, 'raw:' + cityKey(cityName))) as any;
  if (row) return { id: row.id ?? '', name: row.name ?? canon ?? cityName, matched: true };
  const conn = carrier.connector ? CONNECTORS[carrier.connector] : null;
  const built = conn?.cityFor && canon ? conn.cityFor(canon) : null;
  if (built) return { id: built.id, name: built.name, matched: true };
  const hasList = cityCount(carrier.id) > 0 || !!conn?.cityFor;
  return { id: '', name: canon ?? cityName, matched: !hasList && !conn?.needsCityId && !!cityName.trim() };
}

/** Confirmed orders shaped for the export engine (city resolved for this carrier). */
export function exportRowsFor(wsId: number, carrier: Carrier, markExported: boolean): { rows: ExportRow[]; unmatched: string[] } {
  const d = db();
  const orders = d.prepare(`SELECT * FROM orders WHERE workspace_id = ? AND status = 'confirmed' ORDER BY id`).all(wsId) as any[];
  const unmatched: string[] = [];
  const rows = orders.map((r): ExportRow => {
    const c = resolveCity(carrier, r.city || ''); if (!c.matched) unmatched.push(r.order_number);
    const base: ExportOrder = { order_number: r.order_number, customer_name: r.customer_name, phone: r.phone, city: r.city || '', address: r.address || '', products: r.products || '', size: r.size || '', color: r.color || '', quantity: r.quantity, price: r.price, notes: r.notes || '' };
    return { ...base, city_name: c.name, city_id: c.id };
  });
  if (markExported && orders.length) d.prepare(`UPDATE orders SET exported_at = CURRENT_TIMESTAMP WHERE id IN (${orders.map(() => '?').join(',')})`).run(...orders.map((o) => o.id));
  return { rows, unmatched };
}
