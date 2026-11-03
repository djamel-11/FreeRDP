import crypto from 'node:crypto';

/** WhatsApp Business Cloud API (official). */
export const GRAPH_BASE = () => process.env.WA_GRAPH_BASE || `https://graph.facebook.com/${process.env.WA_GRAPH_VERSION || 'v25.0'}`;

export interface WaCreds { phoneNumberId: string; token: string }
export interface WaResult { ok: boolean; id?: string; error?: string }

/** Verify Meta's X-Hub-Signature-256 header (HMAC-SHA256 of the raw body with the app secret). */
export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !header.startsWith('sha256=') || !appSecret) return false;
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest();
  let got: Buffer; try { got = Buffer.from(header.slice(7), 'hex'); } catch { return false; }
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ًͯ-ٟ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ى/g, 'ي').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const YES = new Set(['1', 'oui', 'ouii', 'ok', 'okay', 'okk', 'yes', 'y', 'confirme', 'confirmer', 'confirm', 'daccord', 'نعم', 'اه', 'ايه', 'واه', 'واخا', 'اكد', 'اكدو', 'تاكيد', 'تاكيد الطلب', 'مؤكد', 'موافق', 'اوكد', 'نعم اوكد', 'نعم اكد']);
const NO = new Set(['2', 'non', 'no', 'annuler', 'annule', 'annulee', 'cancel', 'لا', 'الغاء', 'الغي', 'الغيه', 'الغ', 'بغيتش', 'مابغيتش', 'ما بغيتش', 'لا الغي', 'لا الغ', 'لا الغاء']);
/** Short, unambiguous replies only. Anything longer is left for a human. */
export function classifyReply(text: string | null | undefined): 'confirm' | 'cancel' | null {
  const n = norm(text ?? '');
  if (!n || n.split(' ').length > 4) return null;
  if (YES.has(n)) return 'confirm';
  if (NO.has(n)) return 'cancel';
  return null;
}

export interface Inbound { waId: string; from: string; type: string; body: string; name?: string; phoneNumberId: string }
export interface StatusUpdate { waId: string; status: string; phoneNumberId: string }

/** Flatten a Meta webhook payload into inbound messages and delivery statuses. */
export function parseWebhook(payload: any): { inbound: Inbound[]; statuses: StatusUpdate[] } {
  const inbound: Inbound[] = []; const statuses: StatusUpdate[] = [];
  if (payload?.object !== 'whatsapp_business_account') return { inbound, statuses };
  for (const entry of payload.entry ?? []) for (const ch of entry.changes ?? []) {
    const v = ch?.value; const pnid = v?.metadata?.phone_number_id;
    if (ch?.field !== 'messages' || !pnid) continue;
    const names = new Map<string, string>((v.contacts ?? []).map((c: any) => [String(c.wa_id), c.profile?.name]));
    for (const m of v.messages ?? []) {
      const body = m.type === 'text' ? m.text?.body : m.type === 'button' ? m.button?.text ?? m.button?.payload
        : m.type === 'interactive' ? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title : `[${m.type}]`;
      if (m.id && m.from) inbound.push({ waId: String(m.id), from: String(m.from), type: String(m.type), body: String(body ?? ''), name: names.get(String(m.from)), phoneNumberId: String(pnid) });
    }
    for (const s of v.statuses ?? []) if (s.id && s.status) statuses.push({ waId: String(s.id), status: String(s.status), phoneNumberId: String(pnid) });
  }
  return { inbound, statuses };
}

async function post(creds: WaCreds, body: object, fetchImpl: typeof fetch): Promise<WaResult> {
  try {
    const res = await fetchImpl(`${GRAPH_BASE()}/${encodeURIComponent(creds.phoneNumberId)}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${creds.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', ...body }), signal: AbortSignal.timeout(15000),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: `${json?.error?.code ?? res.status}: ${String(json?.error?.message ?? 'error').slice(0, 200)}` };
    return { ok: true, id: json?.messages?.[0]?.id };
  } catch (e: any) { return { ok: false, error: 'network: ' + String(e?.message ?? e).slice(0, 120) }; }
}

/** Free-form text: only allowed within 24h of the customer's last message. */
export const sendText = (c: WaCreds, toE164: string, text: string, f: typeof fetch = fetch) =>
  post(c, { to: toE164.replace('+', ''), type: 'text', text: { body: text, preview_url: false } }, f);

/** Approved template with body variables {{1}}..{{n}} (works outside the 24h window). */
export const sendTemplate = (c: WaCreds, toE164: string, name: string, lang: string, vars: string[], f: typeof fetch = fetch) =>
  post(c, { to: toE164.replace('+', ''), type: 'template', template: { name, language: { code: lang }, components: vars.length ? [{ type: 'body', parameters: vars.map((text) => ({ type: 'text', text: String(text).slice(0, 200) })) }] : [] } }, f);
