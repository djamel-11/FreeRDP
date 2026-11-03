'use server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { createWorkspaceWithOwner, hashPassword, requireAdmin, requireSession, startSession, verifyPassword } from '@/lib/auth';
import { normalizePhone } from '@/lib/phone';
import { parseOrders } from '@/lib/import';
import { ameexCityId, changeStatus, createOrders, getOrder, getWorkspace, teamMembers } from '@/lib/orders';
import { PLANS, type PlanKey } from '@/lib/plans';
import { STATUSES } from '@/lib/i18n';
import { canonicalCity } from '@/lib/cities';
import { decrypt, encrypt } from '@/lib/secrets';
import { sendParcel } from '@/lib/ameex';
import { sendText, sendTemplate } from '@/lib/whatsapp';
import { recordMessage, waCreds, windowOpen } from '@/lib/inbox';

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

export async function setLang(lang: string) {
  (await cookies()).set('akked_lang', lang === 'fr' ? 'fr' : 'ar', { path: '/', maxAge: 31536000 });
  revalidatePath('/', 'layout');
}

export async function signup(f: FormData) {
  const email = s(f, 'email').toLowerCase(), pw = s(f, 'password');
  if (!email.includes('@') || pw.length < 8 || !s(f, 'store')) redirect('/signup?error=invalid');
  if (db().prepare('SELECT 1 FROM users WHERE email = ?').get(email)) redirect('/signup?error=exists');
  const uid = createWorkspaceWithOwner(s(f, 'store'), email, s(f, 'name'), pw);
  await startSession(uid);
  redirect('/orders');
}

export async function login(f: FormData) {
  const u = db().prepare('SELECT * FROM users WHERE email = ?').get(s(f, 'email').toLowerCase()) as any;
  if (!u || !verifyPassword(s(f, 'password'), u.password_hash)) redirect('/login?error=1');
  await startSession(u.id);
  redirect('/confirm');
}

export async function logout() {
  const c = await cookies();
  const t = c.get('akked_session')?.value;
  if (t) db().prepare('DELETE FROM sessions WHERE token = ?').run(t);
  c.delete('akked_session');
  redirect('/login');
}

export async function addOrder(f: FormData) {
  const me = await requireSession();
  const phone = normalizePhone(s(f, 'phone'));
  if (!phone) redirect('/orders/new?error=phone');
  if (!s(f, 'customer_name')) redirect('/orders/new?error=name');
  const r = createOrders(me.workspaceId, me.userId, [{
    customer_name: s(f, 'customer_name'), phone, city: s(f, 'city'), address: s(f, 'address'), products: s(f, 'products'),
    size: s(f, 'size'), color: s(f, 'color'), quantity: Math.max(1, parseInt(s(f, 'quantity')) || 1),
    price: parseFloat(s(f, 'price').replace(',', '.')) || 0, notes: s(f, 'notes'),
  }], 'manual');
  if (r.error) redirect('/orders/new?error=' + r.error);
  redirect('/orders');
}

export async function importOrders(f: FormData) {
  const me = await requireSession();
  let text = s(f, 'text');
  const file = f.get('file');
  if (file instanceof File && file.size > 0) {
    if (file.size > 2_000_000) redirect('/orders/import?error=big');
    text = await file.text();
  }
  const { rows, errors } = parseOrders(text);
  const r = rows.length ? createOrders(me.workspaceId, me.userId, rows, 'import') : { created: 0, error: undefined };
  if (r.error) redirect('/orders/import?error=' + r.error);
  redirect(`/orders/import?ok=${r.created}&skipped=${errors.length}`);
}

export async function updateStatus(f: FormData) {
  const me = await requireSession();
  const status = s(f, 'status');
  if (!(STATUSES as readonly string[]).includes(status)) return;
  changeStatus(me.workspaceId, me.userId, Number(s(f, 'id')), status, s(f, 'callback_at'));
  revalidatePath('/orders');
  redirect(`/orders/${s(f, 'id')}`);
}

/** Open WhatsApp: mark as message_sent when still new, then go to wa.me. */
export async function sendWhatsapp(f: FormData) {
  const me = await requireSession();
  const id = Number(s(f, 'id'));
  const o = db().prepare('SELECT status FROM orders WHERE id = ? AND workspace_id = ?').get(id, me.workspaceId) as any;
  if (o?.status === 'new') changeStatus(me.workspaceId, me.userId, id, 'message_sent');
  const url = s(f, 'url');
  if (!url.startsWith('https://wa.me/')) redirect(`/orders/${id}`);
  redirect(url);
}

export async function saveTemplates(f: FormData) {
  const me = await requireSession();
  db().prepare('UPDATE workspaces SET template_darija=?, template_ar=?, template_fr=? WHERE id=?')
    .run(s(f, 'darija'), s(f, 'ar'), s(f, 'fr'), me.workspaceId);
  revalidatePath('/settings');
}

export async function addAgent(f: FormData) {
  const me = await requireSession();
  if (me.role !== 'owner') redirect('/team');
  const ws = getWorkspace(me.workspaceId);
  if (teamMembers(me.workspaceId).length >= PLANS[ws.plan as PlanKey].users) redirect('/team?error=limit');
  const email = s(f, 'email').toLowerCase(), pw = s(f, 'password');
  if (!email.includes('@') || pw.length < 8) redirect('/team?error=invalid');
  if (db().prepare('SELECT 1 FROM users WHERE email = ?').get(email)) redirect('/team?error=exists');
  db().prepare(`INSERT INTO users (workspace_id, email, full_name, password_hash, role) VALUES (?,?,?,?, 'agent')`)
    .run(me.workspaceId, email, s(f, 'name'), hashPassword(pw));
  redirect('/team');
}

export async function adminSetSubscription(f: FormData) {
  await requireAdmin();
  const plan = s(f, 'plan') as PlanKey;
  if (!(plan in PLANS)) return;
  const days = Math.max(0, parseInt(s(f, 'days')) || 30);
  const suspend = s(f, 'action') === 'suspend';
  const id = Number(s(f, 'id'));
  if (suspend) db().prepare(`UPDATE workspaces SET status='suspended' WHERE id=?`).run(id);
  else db().prepare(`UPDATE workspaces SET plan=?, status='active', period_end=? WHERE id=?`)
    .run(plan, new Date(Date.now() + days * 864e5).toISOString(), id);
  revalidatePath('/admin');
}

export async function saveAmeexCreds(f: FormData) {
  const me = await requireSession();
  if (me.role !== 'owner') redirect('/settings');
  const id = s(f, 'api_id'), key = s(f, 'api_key');
  if (!id) { // empty id = disconnect
    db().prepare('UPDATE workspaces SET ameex_api_id=NULL, ameex_api_key_enc=NULL WHERE id=?').run(me.workspaceId);
    redirect('/settings?ameex=off');
  }
  // blank key keeps the stored one
  if (key) db().prepare('UPDATE workspaces SET ameex_api_id=?, ameex_api_key_enc=? WHERE id=?').run(id, encrypt(key), me.workspaceId);
  else db().prepare('UPDATE workspaces SET ameex_api_id=? WHERE id=?').run(id, me.workspaceId);
  redirect('/settings?ameex=saved');
}

export async function sendToAmeex(f: FormData) {
  const me = await requireSession();
  const id = Number(s(f, 'id'));
  const back = (q: string) => redirect(`/orders/${id}?${q}`);
  const o = getOrder(me.workspaceId, id);
  if (!o || o.status !== 'confirmed') back('ameex=notconfirmed');
  if (o.ameex_parcel_code) back('ameex=already');
  const ws = db().prepare('SELECT ameex_api_id, ameex_api_key_enc FROM workspaces WHERE id=?').get(me.workspaceId) as any;
  if (!ws?.ameex_api_id || !ws?.ameex_api_key_enc) back('ameex=nocreds');
  const cityId = ameexCityId(o.city || '');
  if (cityId == null) back('ameex=nocity');
  const r = await sendParcel({ apiId: ws.ameex_api_id, apiKey: decrypt(ws.ameex_api_key_enc) },
    { ...o, address: o.address || '', city: o.city || '', notes: o.notes || '', products: o.products || '', size: o.size || '', color: o.color || '' }, cityId!);
  if (!r.ok) {
    db().prepare('UPDATE orders SET ameex_error=? WHERE id=?').run(`${r.error}: ${r.raw ?? ''}`.slice(0, 300), id);
    back('ameex=fail');
  }
  db().prepare('UPDATE orders SET ameex_parcel_code=?, ameex_error=? WHERE id=?').run(r.parcelCode ?? 'SENT', r.parcelCode ? null : `no_code: ${r.raw ?? ''}`.slice(0, 300), id);
  changeStatus(me.workspaceId, me.userId, id, 'shipped');
  back('ameex=ok');
}

/** Admin: paste "id,name" lines (AMEEX city ids). Names are matched to canonical cities. */
export async function adminImportCityIds(f: FormData) {
  await requireAdmin();
  let ok = 0; const bad: string[] = [];
  const up = db().prepare('INSERT INTO ameex_cities (canonical, ameex_id) VALUES (?,?) ON CONFLICT(canonical) DO UPDATE SET ameex_id=excluded.ameex_id');
  for (const line of s(f, 'text').split(/\r?\n/)) {
    const m = line.match(/^\s*(\d+)\s*[,;\t]\s*(.+?)\s*$/);
    if (!m) continue;
    const canon = canonicalCity(m[2]);
    if (canon) { up.run(canon, Number(m[1])); ok++; } else bad.push(m[2]);
  }
  redirect(`/admin?cities_ok=${ok}&cities_bad=${encodeURIComponent(bad.slice(0, 40).join('|'))}`);
}

const localStamp = (d: Date) => { const z = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; };

/** Called when the agent taps the WhatsApp button in the queue: new → message_sent. */
export async function markSent(id: number) {
  const me = await requireSession();
  const o = db().prepare('SELECT status FROM orders WHERE id = ? AND workspace_id = ?').get(id, me.workspaceId) as any;
  if (o?.status === 'new') changeStatus(me.workspaceId, me.userId, id, 'message_sent');
  revalidatePath('/confirm');
}

/** One-tap result from the confirmation queue (bound per button: id, status, optional hours/"tomorrow"). */
export async function quickStatus(id: number, status: string, hours: string, _fd?: FormData) {
  const me = await requireSession();
  if (!['confirmed', 'cancelled', 'no_answer', 'callback'].includes(status)) return;
  let cb: string | null = null;
  if (status === 'callback') {
    const d = new Date();
    if (hours === 'tomorrow') { d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); } else d.setHours(d.getHours() + (parseInt(hours) || 2));
    cb = localStamp(d);
  }
  changeStatus(me.workspaceId, me.userId, Number(id), status, cb);
  revalidatePath('/confirm');
  redirect('/confirm?lane=reply');
}

/** Save the reviewed drafts from the smart-add screen. */
export async function quickAddOrders(f: FormData) {
  const me = await requireSession();
  let drafts: any[] = [];
  try { drafts = JSON.parse(s(f, 'drafts')); } catch { /* ignore */ }
  if (!Array.isArray(drafts)) drafts = [];
  const rows = []; let skipped = 0;
  for (const d of drafts.slice(0, 200)) {
    const phone = normalizePhone(String(d.phone ?? ''));
    const name = String(d.customer_name ?? '').trim();
    if (!phone || !name) { skipped++; continue; }
    rows.push({
      customer_name: name.slice(0, 120), phone, city: String(d.city ?? '').trim().slice(0, 80), address: String(d.address ?? '').trim().slice(0, 300),
      products: String(d.products ?? '').trim().slice(0, 200), size: String(d.size ?? '').trim().slice(0, 40), color: String(d.color ?? '').trim().slice(0, 40),
      quantity: Math.max(1, parseInt(String(d.quantity)) || 1), price: parseFloat(String(d.price ?? '').replace(',', '.')) || 0, notes: String(d.notes ?? '').trim().slice(0, 500),
    });
  }
  if (!rows.length) redirect('/orders/quick?error=none');
  const r = createOrders(me.workspaceId, me.userId, rows, 'quick');
  if (r.error) redirect('/orders/quick?error=' + r.error);
  redirect(`/orders?added=${r.created}&skipped=${skipped}`);
}

export async function saveWhatsapp(f: FormData) {
  const me = await requireSession();
  if (me.role !== 'owner') redirect('/settings');
  const pnid = s(f, 'phone_number_id'), token = s(f, 'token');
  if (!pnid) { db().prepare('UPDATE workspaces SET wa_phone_number_id=NULL, wa_token_enc=NULL WHERE id=?').run(me.workspaceId); redirect('/settings?wa=off'); }
  if (!/^\d{5,25}$/.test(pnid)) redirect('/settings?wa=invalid');
  try {
    db().prepare('UPDATE workspaces SET wa_phone_number_id=?, wa_template_name=?, wa_template_lang=? WHERE id=?').run(pnid, s(f, 'template') || 'order_confirmation', s(f, 'lang') || 'ar', me.workspaceId);
    if (token) db().prepare('UPDATE workspaces SET wa_token_enc=? WHERE id=?').run(encrypt(token), me.workspaceId);
  } catch { redirect('/settings?wa=taken'); }
  redirect('/settings?wa=saved');
}

/** Official one-click confirmation: sends the approved template and moves the order to "message sent". */
export async function sendConfirmTemplate(id: number, _fd?: FormData) {
  const me = await requireSession();
  const o = getOrder(me.workspaceId, id);
  if (!o || o.status !== 'new') redirect('/confirm?err=err_state');
  const c = waCreds(me.workspaceId);
  if (!c) redirect('/confirm?err=err_wa_nocreds');
  const r = await sendTemplate(c!, o.phone, c!.template, c!.lang, [o.customer_name, [o.products, o.size, o.color].filter(Boolean).join(' ') || '-', String(o.price), o.city || '-']);
  if (!r.ok) redirect('/confirm?err=' + encodeURIComponent(r.error ?? 'error'));
  recordMessage(me.workspaceId, { waId: r.id, phone: o.phone, direction: 'out', type: 'template', body: `[${c!.template}] ${o.customer_name} · ${o.products ?? ''} · ${o.price} MAD`, status: 'sent', orderId: o.id });
  changeStatus(me.workspaceId, me.userId, id, 'message_sent');
  redirect('/confirm');
}

export async function sendWaText(digits: string, f: FormData) {
  const me = await requireSession();
  const phone = '+' + digits.replace(/\D/g, ''); const back = `/inbox/${digits.replace(/\D/g, '')}`;
  const text = s(f, 'text');
  if (!text) redirect(back);
  const c = waCreds(me.workspaceId);
  if (!c) redirect(back + '?err=err_wa_nocreds');
  if (!windowOpen(me.workspaceId, phone)) redirect(back + '?err=window');
  const r = await sendText(c!, phone, text.slice(0, 1000));
  if (!r.ok) redirect(back + '?err=' + encodeURIComponent(r.error ?? 'error'));
  recordMessage(me.workspaceId, { waId: r.id, phone, direction: 'out', type: 'text', body: text.slice(0, 1000), status: 'sent' });
  redirect(back);
}

export async function inboxStatus(id: number, status: string, digits: string, _fd?: FormData) {
  const me = await requireSession();
  if (['confirmed', 'cancelled', 'no_answer'].includes(status)) changeStatus(me.workspaceId, me.userId, id, status);
  redirect(`/inbox/${digits.replace(/\D/g, '')}`);
}
