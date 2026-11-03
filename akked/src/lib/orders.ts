import { db } from './db';
import { ameexIdFor, canonicalCity } from './cities';
import { canAddOrders, PLANS, type PlanKey, type WorkspaceState } from './plans';
import type { ParsedOrder } from './import';
import { normalizePhone } from './phone';
import type { ExportOrder } from './exporters';

export interface Workspace extends WorkspaceState {
  id: number; name: string; template_darija: string | null; template_ar: string | null; template_fr: string | null;
}
export const getWorkspace = (id: number) => db().prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as Workspace;

export function monthlyUsage(wsId: number, now = new Date()): number {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().replace('T', ' ').slice(0, 19);
  return (db().prepare('SELECT COUNT(*) c FROM orders WHERE workspace_id = ? AND created_at >= ?').get(wsId, start) as any).c;
}

export function createOrders(wsId: number, userId: number | null, rows: ParsedOrder[], source: string, now = new Date()) {
  const d = db();
  const ws = getWorkspace(wsId);
  const check = canAddOrders(ws, monthlyUsage(wsId, now), rows.length, now);
  if (!check.ok) return { created: 0, error: check.reason };
  const ins = d.prepare(`INSERT INTO orders (workspace_id, customer_name, phone, city, address, products, size, color, quantity, price, notes, source)
    VALUES (@wsId, @customer_name, @phone, @city, @address, @products, @size, @color, @quantity, @price, @notes, @source)`);
  const num = d.prepare(`UPDATE orders SET order_number = ? WHERE id = ?`);
  d.transaction(() => {
    for (const r of rows) {
      const info = ins.run({ ...r, city: canonicalCity(r.city) ?? r.city, wsId, source });
      num.run('AK-' + (10000 + Number(info.lastInsertRowid)), info.lastInsertRowid);
    }
  })();
  return { created: rows.length, error: undefined };
}

export interface OrderFilters { status?: string; q?: string; city?: string; agent?: string; from?: string; to?: string }
export function listOrders(wsId: number, f: OrderFilters) {
  const where = ['o.workspace_id = @ws']; const p: Record<string, any> = { ws: wsId };
  if (f.status) { where.push('o.status = @status'); p.status = f.status; }
  if (f.city) { where.push('o.city = @city'); p.city = f.city; }
  if (f.agent) { where.push('o.agent_id = @agent'); p.agent = Number(f.agent); }
  if (f.from) { where.push('date(o.created_at) >= @from'); p.from = f.from; }
  if (f.to) { where.push('date(o.created_at) <= @to'); p.to = f.to; }
  if (f.q) { where.push('(o.customer_name LIKE @q OR o.phone LIKE @q)'); p.q = `%${f.q.replace(/[%_]/g, '')}%`; }
  return db().prepare(`SELECT o.*, (SELECT COUNT(*) FROM orders x WHERE x.workspace_id = o.workspace_id AND x.phone = o.phone AND x.id <> o.id AND x.status IN ('cancelled','returned')) AS refusals
    FROM orders o WHERE ${where.join(' AND ')} ORDER BY o.id DESC LIMIT 300`).all(p) as any[];
}

export const getOrder = (wsId: number, id: number) =>
  db().prepare('SELECT * FROM orders WHERE id = ? AND workspace_id = ?').get(id, wsId) as any;

/** Previous orders for the same phone in the SAME workspace only. */
export const customerHistory = (wsId: number, phone: string, excludeId: number) =>
  db().prepare('SELECT id, order_number, status, price, products, created_at FROM orders WHERE workspace_id = ? AND phone = ? AND id <> ? ORDER BY id DESC').all(wsId, phone, excludeId) as any[];

export function changeStatus(wsId: number, userId: number | null, id: number, status: string, callbackAt?: string | null, note?: string) {
  const o = getOrder(wsId, id);
  if (!o) return false;
  const d = db();
  d.transaction(() => {
    d.prepare(`UPDATE orders SET status = ?, callback_at = ?, status_changed_at = CURRENT_TIMESTAMP, agent_id = COALESCE(agent_id, ?), claimed_by = NULL, claimed_at = NULL WHERE id = ?`)
      .run(status, status === 'callback' ? callbackAt || null : null, userId, id);
    d.prepare('INSERT INTO order_events (order_id, user_id, from_status, to_status, note) VALUES (?,?,?,?,?)').run(id, userId, o.status, status, note ?? null);
  })();
  return true;
}

export function stats(wsId: number) {
  const d = db();
  const total = (d.prepare('SELECT COUNT(*) c FROM orders WHERE workspace_id = ?').get(wsId) as any).c as number;
  const by = (s: string[]) => (d.prepare(`SELECT COUNT(*) c FROM orders WHERE workspace_id = ? AND status IN (${s.map(() => '?').join(',')})`).get(wsId, ...s) as any).c as number;
  const confirmed = by(['confirmed', 'shipped', 'delivered', 'returned']);
  const refused = by(['cancelled', 'returned']);
  const perDay = d.prepare(`SELECT date(created_at) day, COUNT(*) c FROM orders WHERE workspace_id = ? AND date(created_at) >= date('now','-13 days') GROUP BY day ORDER BY day`).all(wsId) as any[];
  const cities = d.prepare(`SELECT city, COUNT(*) c FROM orders WHERE workspace_id = ? AND city <> '' GROUP BY city ORDER BY c DESC LIMIT 5`).all(wsId) as any[];
  const agents = d.prepare(`SELECT u.full_name name, COUNT(*) handled, SUM(o.status IN ('confirmed','shipped','delivered')) confirmed
    FROM orders o JOIN users u ON u.id = o.agent_id WHERE o.workspace_id = ? GROUP BY u.id`).all(wsId) as any[];
  const cnt = (s: string) => (d.prepare(`SELECT COUNT(*) c FROM orders WHERE workspace_id = ? AND status = '${s}'`).get(wsId) as any).c as number;
  const delivered = cnt('delivered'), returned = cnt('returned');
  const reasons = d.prepare(`SELECT COALESCE(cancel_reason, 'unspecified') reason, COUNT(*) c FROM orders WHERE workspace_id = ? AND status = 'cancelled' GROUP BY reason ORDER BY c DESC`).all(wsId) as any[];
  return { total, confirmRate: total ? confirmed / total : 0, refusalRate: total ? refused / total : 0, perDay, cities, agents, delivered, returned, returnRate: delivered + returned ? returned / (delivered + returned) : 0, reasons };
}

export function exportableOrders(wsId: number, markExported: boolean): ExportOrder[] {
  const d = db();
  const rows = d.prepare(`SELECT * FROM orders WHERE workspace_id = ? AND status = 'confirmed' ORDER BY id`).all(wsId) as any[];
  if (markExported && rows.length) {
    const ids = rows.map((r) => r.id);
    d.prepare(`UPDATE orders SET exported_at = CURRENT_TIMESTAMP WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
  }
  return rows.map((r) => ({
    order_number: r.order_number, customer_name: r.customer_name, phone: r.phone, city: r.city || '', address: r.address || '',
    products: r.products || '', size: r.size || '', color: r.color || '', quantity: r.quantity, price: r.price, notes: r.notes || '',
  }));
}

export const teamMembers = (wsId: number) => db().prepare('SELECT id, full_name, email, role FROM users WHERE workspace_id = ?').all(wsId) as any[];
export { PLANS, type PlanKey };

/** Confirmed orders whose city isn't recognised (would be exported with the raw spelling). */
export function unmatchedCities(wsId: number): { id: number; order_number: string; city: string }[] {
  const rows = db().prepare(`SELECT id, order_number, city FROM orders WHERE workspace_id = ? AND status = 'confirmed'`).all(wsId) as any[];
  return rows.filter((r) => !canonicalCity(r.city));
}

/** Admin-imported override (table) wins; otherwise the built-in official AMEEX list. */
export function ameexCityId(city: string): number | null {
  const canon = canonicalCity(city);
  if (!canon) return null;
  const r = db().prepare('SELECT ameex_id FROM ameex_cities WHERE canonical = ?').get(canon) as any;
  return r ? r.ameex_id : ameexIdFor(canon);
}

const localNow = () => { const d = new Date(); const z = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; };

/** Confirmation queue: "send" = new orders; "reply" = waiting for an answer (+ callbacks that are due).
 *  The order shown is claimed for `userId` for 10 minutes so two agents never work on the same one. */
export type Lane = 'send' | 'reply' | 'call';
export function queue(wsId: number, lane: Lane, skip: number[] = [], userId: number | null = null) {
  const where = lane === 'send' ? `status = 'new'`
    : lane === 'reply' ? `status = 'message_sent'`
    : `(status = 'no_answer' OR (status = 'callback' AND callback_at IS NOT NULL AND callback_at <= @now))`;
  const base = `FROM orders WHERE workspace_id = @ws AND ${where}`;
  const p: Record<string, string | number> = lane === 'call' ? { ws: wsId, now: localNow() } : { ws: wsId }; // node:sqlite rejects unused named params
  const count = (db().prepare(`SELECT COUNT(*) c ${base}`).get(p) as any).c as number;
  const ids = skip.filter((n) => Number.isInteger(n));
  const notSkipped = ids.length ? ` AND id NOT IN (${ids.join(',')})` : '';
  const free = userId == null ? '' : ` AND (claimed_by IS NULL OR claimed_by = ${Number(userId)} OR claimed_at < datetime('now','-10 minutes'))`;
  const order = lane === 'send' ? 'id ASC' : lane === 'reply' ? 'status_changed_at ASC, id ASC' : 'COALESCE(callback_at, status_changed_at) ASC, id ASC';
  const next = db().prepare(`SELECT *, (SELECT COUNT(*) FROM orders x WHERE x.workspace_id = orders.workspace_id AND x.phone = orders.phone AND x.id <> orders.id AND x.status IN ('cancelled','returned')) AS refusals ${base}${notSkipped}${free} ORDER BY ${order} LIMIT 1`).get(p) as any;
  if (next && userId != null) {
    db().prepare(`UPDATE orders SET claimed_by = NULL, claimed_at = NULL WHERE workspace_id = ? AND claimed_by = ? AND id <> ?`).run(wsId, userId, next.id);
    db().prepare(`UPDATE orders SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(userId, next.id);
  }
  return { count, next };
}
export const queueCounts = (wsId: number) => ({ send: queue(wsId, 'send').count, reply: queue(wsId, 'reply').count, call: queue(wsId, 'call').count });

export interface OrderEdit { customer_name: string; phone: string; city: string; address: string; products: string; size: string; color: string; quantity: number; price: number; notes: string }
/** Edit an order (all roles). Normalises phone and city; records which fields changed in the order history. */
export function updateOrder(wsId: number, userId: number | null, id: number, input: Partial<Record<keyof OrderEdit, string>>): { ok: boolean; error?: 'not_found' | 'phone' | 'name' } {
  const o = getOrder(wsId, id); if (!o) return { ok: false, error: 'not_found' };
  const phone = normalizePhone(input.phone ?? ''); if (!phone) return { ok: false, error: 'phone' };
  const name = (input.customer_name ?? '').trim(); if (!name) return { ok: false, error: 'name' };
  const city = (input.city ?? '').trim();
  const next: OrderEdit = {
    customer_name: name.slice(0, 120), phone, city: (canonicalCity(city) ?? city).slice(0, 80), address: (input.address ?? '').trim().slice(0, 300),
    products: (input.products ?? '').trim().slice(0, 200), size: (input.size ?? '').trim().slice(0, 40), color: (input.color ?? '').trim().slice(0, 40),
    quantity: Math.max(1, parseInt(input.quantity ?? '') || 1), price: parseFloat((input.price ?? '').replace(',', '.')) || 0, notes: (input.notes ?? '').trim().slice(0, 500),
  };
  const changed = (Object.keys(next) as (keyof OrderEdit)[]).filter((k) => String(o[k] ?? '') !== String(next[k]));
  if (!changed.length) return { ok: true };
  const d = db();
  d.transaction(() => {
    d.prepare(`UPDATE orders SET customer_name=?, phone=?, city=?, address=?, products=?, size=?, color=?, quantity=?, price=?, notes=? WHERE id=? AND workspace_id=?`)
      .run(next.customer_name, next.phone, next.city, next.address, next.products, next.size, next.color, next.quantity, next.price, next.notes, id, wsId);
    d.prepare('INSERT INTO order_events (order_id, user_id, from_status, to_status, note) VALUES (?,?,?,?,?)').run(id, userId, o.status, o.status, 'edit: ' + changed.join(','));
  })();
  return { ok: true };
}

/** Onboarding checklist state for the first-run card. */
export function onboarding(wsId: number) {
  const c = (sql: string) => (db().prepare(sql).get(wsId) as any).c as number;
  const total = c(`SELECT COUNT(*) c FROM orders WHERE workspace_id = ?`);
  const sent = c(`SELECT COUNT(*) c FROM orders WHERE workspace_id = ? AND status <> 'new'`);
  const confirmed = c(`SELECT COUNT(*) c FROM orders WHERE workspace_id = ? AND status IN ('confirmed','shipped','delivered')`);
  const steps = [total > 0, sent > 0, confirmed > 0];
  return { total, steps, done: steps.every(Boolean), show: total < 15 && !steps.every(Boolean) };
}

export const DEMO_ORDERS: ParsedOrder[] = [
  { customer_name: 'سارة العلوي', phone: '+212612345678', city: 'Casablanca', address: 'شارع الزرقطوني رقم 12', products: 'فستان', size: 'M', color: 'أسود', quantity: 1, price: 199, notes: '' },
  { customer_name: 'Youssef Bennani', phone: '+212661223344', city: 'Fes', address: 'Hay Atlas rue 5', products: 'Veste', size: 'L', color: '', quantity: 1, price: 250, notes: '' },
  { customer_name: 'هند', phone: '+212700112233', city: 'Marrakech', address: '', products: 'حقيبة', size: '', color: '', quantity: 1, price: 120, notes: '' },
  { customer_name: 'Omar', phone: '+212655443322', city: 'Tanger', address: 'Av. Mohammed V n 40', products: 'Chemise', size: 'XL', color: 'Blanc', quantity: 2, price: 180, notes: '' },
  { customer_name: 'فاطمة', phone: '+212677889900', city: 'Rabat', address: 'حي الرياض', products: 'قفطان', size: '', color: '', quantity: 1, price: 350, notes: '' },
];
