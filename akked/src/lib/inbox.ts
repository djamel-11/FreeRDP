import { db } from './db';
import { changeStatus } from './orders';
import { classifyReply, parseWebhook } from './whatsapp';
import { normalizePhone } from './phone';
import { decrypt } from './secrets';
import type { WaCreds } from './whatsapp';

export function waCreds(wsId: number): (WaCreds & { template: string; lang: string }) | null {
  const w = db().prepare('SELECT wa_phone_number_id, wa_token_enc, wa_template_name, wa_template_lang FROM workspaces WHERE id = ?').get(wsId) as any;
  if (!w?.wa_phone_number_id || !w?.wa_token_enc) return null;
  return { phoneNumberId: w.wa_phone_number_id, token: decrypt(w.wa_token_enc), template: w.wa_template_name || 'order_confirmation', lang: w.wa_template_lang || 'ar' };
}

export function recordMessage(wsId: number, m: { waId?: string | null; phone: string; direction: 'in' | 'out'; type: string; body: string; status?: string; orderId?: number | null }): boolean {
  const r = db().prepare(`INSERT OR IGNORE INTO wa_messages (workspace_id, wa_id, phone, direction, type, body, status, order_id) VALUES (?,?,?,?,?,?,?,?)`)
    .run(wsId, m.waId ?? null, m.phone, m.direction, m.type, m.body, m.status ?? null, m.orderId ?? null);
  return Number(r.changes) > 0;
}

export const lastInboundAt = (wsId: number, phone: string): Date | null => {
  const r = db().prepare(`SELECT created_at FROM wa_messages WHERE workspace_id = ? AND phone = ? AND direction = 'in' ORDER BY id DESC LIMIT 1`).get(wsId, phone) as any;
  return r ? new Date(r.created_at.replace(' ', 'T') + 'Z') : null;
};
/** WhatsApp lets you send free-form text only within 24h of the customer's last message. */
export const windowOpen = (wsId: number, phone: string, now = new Date()) => {
  const t = lastInboundAt(wsId, phone); return !!t && now.getTime() - t.getTime() < 24 * 3600e3;
};

export function conversations(wsId: number) {
  return db().prepare(`
    SELECT m.phone, m.body, m.direction, m.created_at,
      (SELECT customer_name FROM orders o WHERE o.workspace_id = m.workspace_id AND o.phone = m.phone ORDER BY o.id DESC LIMIT 1) AS name
    FROM wa_messages m WHERE m.id IN (SELECT MAX(id) FROM wa_messages WHERE workspace_id = ? GROUP BY phone)
    ORDER BY m.id DESC LIMIT 100`).all(wsId) as any[];
}
export const thread = (wsId: number, phone: string) =>
  db().prepare('SELECT * FROM wa_messages WHERE workspace_id = ? AND phone = ? ORDER BY id ASC LIMIT 300').all(wsId, phone) as any[];

export const openOrderFor = (wsId: number, phone: string) =>
  db().prepare(`SELECT * FROM orders WHERE workspace_id = ? AND phone = ? ORDER BY (status IN ('new','message_sent','no_answer','callback')) DESC, id DESC LIMIT 1`).get(wsId, phone) as any;

/** Store inbound messages / delivery statuses; short yes/no replies update the customer's open order automatically. */
export function handleWebhook(payload: unknown) {
  const { inbound, statuses } = parseWebhook(payload);
  const out = { messages: 0, autoUpdated: 0, statuses: 0 };
  const wsOf = (pnid: string) => (db().prepare('SELECT id FROM workspaces WHERE wa_phone_number_id = ?').get(pnid) as any)?.id as number | undefined;
  for (const m of inbound) {
    const wsId = wsOf(m.phoneNumberId); if (!wsId) continue;
    const phone = normalizePhone('+' + m.from) ?? '+' + m.from;
    if (!recordMessage(wsId, { waId: m.waId, phone, direction: 'in', type: m.type, body: m.body })) continue; // duplicate delivery
    out.messages++;
    const intent = classifyReply(m.body); if (!intent) continue;
    const o = db().prepare(`SELECT id FROM orders WHERE workspace_id = ? AND phone = ? AND status IN ('new','message_sent','no_answer','callback') ORDER BY id DESC LIMIT 1`).get(wsId, phone) as any;
    if (o && changeStatus(wsId, null, o.id, intent === 'confirm' ? 'confirmed' : 'cancelled', null, 'auto: whatsapp reply')) out.autoUpdated++;
  }
  for (const s of statuses) {
    const wsId = wsOf(s.phoneNumberId); if (!wsId) continue;
    db().prepare('UPDATE wa_messages SET status = ? WHERE workspace_id = ? AND wa_id = ?').run(s.status, wsId, s.waId); out.statuses++;
  }
  return out;
}
