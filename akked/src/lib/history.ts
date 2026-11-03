import crypto from 'node:crypto';
import { db } from './db';
import { canonicalCity } from './cities';
import { normalizePhone } from './phone';
import { suggestSource } from './exportEngine';
import type { Table } from './tableReader';

/** Import past orders from a carrier's export (AMEEX or any company) so the "refused before" badge and the stats work from day one. */
export const FIELDS = ['order_number', 'customer_name', 'phone', 'city', 'address', 'price', 'products', 'quantity', 'notes', 'status', 'date', 'parcel_code', 'ignore'] as const;
export type Field = (typeof FIELDS)[number];
export const HIST_STATUSES = ['delivered', 'returned', 'cancelled', 'shipped', 'confirmed'] as const;
export type HistStatus = (typeof HIST_STATUSES)[number];

export function suggestField(header: string): Field {
  const h = header.trim();
  if (/(statut|status|[ée]tat|الحالة)/i.test(h)) return 'status';
  if (/(colis|tracking|suivi|parcel|code\s*(colis|suivi))/i.test(h) && !/(nbr|nombre|qt)/i.test(h)) return 'parcel_code';
  if (/(date|تاريخ)/i.test(h)) return 'date';
  const s = suggestSource(h);
  const map: Record<string, Field> = { order_number: 'order_number', customer_name: 'customer_name', phone_national: 'phone', phone_e164: 'phone', city: 'city', address: 'address', price: 'price', product_full: 'products', products: 'products', quantity: 'quantity', notes: 'notes' };
  return map[s] ?? 'ignore';
}

/** Conservative keyword mapping of a carrier's status text; anything unclear is treated as "shipped" (in progress). */
export function suggestStatus(raw: string): HistStatus {
  const s = raw.toLowerCase();
  if (/retour|return|refus|مرتجع|رفض|non\s*livr|undeliver|not\s*deliver|injoignable/.test(s)) return 'returned';
  if (/annul|cancel|ملغ/.test(s)) return 'cancelled';
  if (/livr[ée]|deliver|تسليم|تم التوصيل|encaiss|pay[ée]|cl[ôo]tur/.test(s)) return 'delivered';
  return 'shipped';
}

export function parseDate(raw: string): string | null {
  const s = raw.trim(); if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  let y: number, mo: number, d: number, hh = 0, mi = 0, ss = 0;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; hh = +(m[4] ?? 0); mi = +(m[5] ?? 0); ss = +(m[6] ?? 0); }
  else {
    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/); if (!m) return null; // day first (Morocco)
    d = +m[1]; mo = +m[2]; y = +m[3]; if (y < 100) y += 2000; hh = +(m[4] ?? 0); mi = +(m[5] ?? 0); ss = +(m[6] ?? 0);
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const z = (n: number) => String(n).padStart(2, '0');
  return `${y}-${z(mo)}-${z(d)} ${z(hh)}:${z(mi)}:${z(ss)}`;
}

export interface HistRow { order_number: string; customer_name: string; phone: string; city: string; address: string; price: number; products: string; quantity: number; notes: string; status: HistStatus; created_at: string | null; parcel_code: string }
export interface HistoryMapping { fields: Record<number, Field>; statusMap: Record<string, HistStatus>; defaultStatus: HistStatus }

export const defaultFields = (t: Table): Record<number, Field> => {
  const f: Record<number, Field> = {}; const used = new Set<Field>();
  for (const h of t.headers) { let s = suggestField(h.header); if (s !== 'ignore' && s !== 'notes' && used.has(s)) s = 'ignore'; used.add(s); f[h.col] = s; }
  return f;
};
export const distinctStatuses = (t: Table, fields: Record<number, Field>): string[] => {
  const col = Object.entries(fields).find(([, v]) => v === 'status')?.[0]; if (!col) return [];
  return [...new Set(t.rows.map((r) => (r[+col - 1] ?? '').trim()).filter(Boolean))].slice(0, 40);
};

export function planImport(t: Table, m: HistoryMapping): { rows: HistRow[]; invalid: number } {
  const idx = (f: Field) => { const e = Object.entries(m.fields).find(([, v]) => v === f); return e ? +e[0] - 1 : -1; };
  const get = (r: string[], f: Field) => { const i = idx(f); return i >= 0 ? (r[i] ?? '').trim() : ''; };
  const rows: HistRow[] = []; let invalid = 0;
  for (const r of t.rows) {
    const phone = normalizePhone(get(r, 'phone')); const name = get(r, 'customer_name');
    if (!phone || !name) { invalid++; continue; }
    const raw = get(r, 'status'); const city = get(r, 'city');
    rows.push({
      order_number: get(r, 'order_number').slice(0, 40), customer_name: name.slice(0, 120), phone, city: (canonicalCity(city) ?? city).slice(0, 80), address: get(r, 'address').slice(0, 300),
      price: parseFloat(get(r, 'price').replace(/\s/g, '').replace(',', '.')) || 0, products: get(r, 'products').slice(0, 200), quantity: Math.max(1, parseInt(get(r, 'quantity')) || 1),
      notes: get(r, 'notes').slice(0, 500), status: raw ? (m.statusMap[raw] ?? suggestStatus(raw)) : m.defaultStatus, created_at: parseDate(get(r, 'date')), parcel_code: get(r, 'parcel_code').slice(0, 60),
    });
  }
  return { rows, invalid };
}

/** Insert as historical orders: they never enter the confirmation queue, are not counted in the monthly quota, and re-importing the same file adds nothing. */
export function importHistory(wsId: number, rows: HistRow[]): { added: number; duplicates: number } {
  const d = db();
  const seen = new Set((d.prepare(`SELECT h FROM sheet_seen WHERE workspace_id = ? AND h LIKE 'h:%'`).all(wsId) as any[]).map((r) => r.h as string));
  const count = new Map<string, number>(); let added = 0, duplicates = 0;
  const ins = d.prepare(`INSERT INTO orders (workspace_id, order_number, customer_name, phone, city, address, products, quantity, price, notes, status, source, created_at, status_changed_at, parcel_code)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,'history',COALESCE(?, CURRENT_TIMESTAMP),COALESCE(?, CURRENT_TIMESTAMP),?)`);
  const num = d.prepare(`UPDATE orders SET order_number = ? WHERE id = ?`); const mark = d.prepare('INSERT OR IGNORE INTO sheet_seen (workspace_id, h) VALUES (?, ?)');
  d.transaction(() => {
    for (const r of rows) {
      const base = [r.phone, r.customer_name.toLowerCase(), r.price, r.created_at ?? '', r.products.toLowerCase(), r.order_number].join('|');
      const n = (count.get(base) ?? 0) + 1; count.set(base, n);
      const h = 'h:' + crypto.createHash('sha1').update(base + '|' + n).digest('hex');
      if (seen.has(h)) { duplicates++; continue; }
      const info = ins.run(wsId, r.order_number || null, r.customer_name, r.phone, r.city, r.address, r.products, r.quantity, r.price, r.notes, r.status, r.created_at, r.created_at, r.parcel_code || null);
      if (!r.order_number) num.run('AK-' + (10000 + Number(info.lastInsertRowid)), info.lastInsertRowid);
      mark.run(wsId, h); added++;
    }
  })();
  return { added, duplicates };
}
