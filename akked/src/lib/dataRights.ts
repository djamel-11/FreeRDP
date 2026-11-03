import { db } from './db';
import { normalizePhone } from './phone';

/** Everything a seller owns, as plain JSON (their right of access/portability). Never includes other tenants or secrets. */
export function exportWorkspaceData(wsId: number) {
  const d = db();
  const orders = d.prepare('SELECT * FROM orders WHERE workspace_id = ? ORDER BY id').all(wsId) as any[];
  const strip = ({ claimed_by, claimed_at, ...o }: any) => o;
  return {
    exported_at: new Date().toISOString(),
    workspace: d.prepare('SELECT id, name, plan, status, period_end, created_at FROM workspaces WHERE id = ?').get(wsId),
    users: d.prepare('SELECT id, full_name, email, role FROM users WHERE workspace_id = ?').all(wsId),
    orders: orders.map(strip),
    order_events: d.prepare('SELECT e.* FROM order_events e JOIN orders o ON o.id = e.order_id WHERE o.workspace_id = ? ORDER BY e.id').all(wsId),
    whatsapp_messages: d.prepare('SELECT id, phone, direction, type, body, status, created_at FROM wa_messages WHERE workspace_id = ? ORDER BY id').all(wsId),
    carriers: d.prepare('SELECT id, name, connector, config, template_name FROM carriers WHERE workspace_id = ?').all(wsId),
    payments: d.prepare('SELECT id, plan, amount, method, reference, status, created_at FROM payments WHERE workspace_id = ? ORDER BY id').all(wsId),
  };
}

/** A customer asks to be forgotten: anonymise their orders and drop their WhatsApp messages (statistics keep working). */
export function eraseCustomer(wsId: number, phoneInput: string): { ok: boolean; orders: number; messages: number } {
  const phone = normalizePhone(phoneInput); if (!phone) return { ok: false, orders: 0, messages: 0 };
  const d = db(); let orders = 0, messages = 0;
  d.transaction(() => {
    orders = Number(d.prepare(`UPDATE orders SET customer_name = 'Client supprimé', phone = '+212000000000', address = '', notes = '' WHERE workspace_id = ? AND phone = ?`).run(wsId, phone).changes);
    messages = Number(d.prepare('DELETE FROM wa_messages WHERE workspace_id = ? AND phone = ?').run(wsId, phone).changes);
  })();
  return { ok: true, orders, messages };
}

/** Permanently delete a seller's workspace and all of its data. */
export function deleteWorkspace(wsId: number) {
  const d = db();
  d.transaction(() => {
    d.prepare('DELETE FROM order_events WHERE order_id IN (SELECT id FROM orders WHERE workspace_id = ?)').run(wsId);
    d.prepare('DELETE FROM wa_messages WHERE workspace_id = ?').run(wsId);
    d.prepare('DELETE FROM orders WHERE workspace_id = ?').run(wsId);
    d.prepare('DELETE FROM carrier_cities WHERE carrier_id IN (SELECT id FROM carriers WHERE workspace_id = ?)').run(wsId);
    d.prepare('DELETE FROM carriers WHERE workspace_id = ?').run(wsId);
    d.prepare('DELETE FROM payments WHERE workspace_id = ?').run(wsId);
    d.prepare('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE workspace_id = ?)').run(wsId);
    d.prepare('DELETE FROM users WHERE workspace_id = ?').run(wsId);
    d.prepare('DELETE FROM workspaces WHERE id = ?').run(wsId);
  })();
}
