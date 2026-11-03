'use server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { createWorkspaceWithOwner, requireAdmin, requireOwner, requireSession, startSession } from '@/lib/auth';
import { hashPassword, verifyPassword, normalizeRecoveryCode, tempPassword, generateRecoveryCode } from '@/lib/password';
import { clearFails, recordFail, tooMany } from '@/lib/ratelimit';
import { normalizePhone } from '@/lib/phone';
import { parseOrders } from '@/lib/import';
import { changeStatus, createOrders, DEMO_ORDERS, getOrder, getWorkspace, teamMembers, updateOrder } from '@/lib/orders';
import { PLANS, type PlanKey } from '@/lib/plans';
import { STATUSES } from '@/lib/i18n';
import { canonicalCity } from '@/lib/cities';
import { decrypt, encrypt } from '@/lib/secrets';
import { sendParcel } from '@/lib/ameex';
import { CANCEL_REASONS } from '@/lib/reasons';
import { bulkSend, sendOrderViaCarrier, trackWorkspace } from '@/lib/carrierFlow';
import { CONNECTORS } from '@/lib/connectors';
import { createCarrier, createFromPreset, deleteCarrier, getCarrier, listCarriers, renameCarrier, setCities, setConfig, setCreds, setTemplate } from '@/lib/carriers';
import { mergeMapping, readTemplate, SOURCES, suggestSource, type ColumnMap, type ExportConfig, type Source } from '@/lib/exportEngine';
import { parseSheetUrl, syncSheet } from '@/lib/sheets';
import { sendText, sendTemplate } from '@/lib/whatsapp';
import { checkProof, createPayment, decidePayment } from '@/lib/billing';
import { setSetting, SETTING_KEYS } from '@/lib/settings';
import { deleteWorkspace, eraseCustomer } from '@/lib/dataRights';
import { recordMessage, waCreds, windowOpen } from '@/lib/inbox';

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

export async function setLang(lang: string) {
  (await cookies()).set('akked_lang', lang === 'fr' ? 'fr' : 'ar', { path: '/', maxAge: 31536000 });
  revalidatePath('/', 'layout');
}

const flash = async (name: string, value: string) => (await cookies()).set(name, value, { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 600, secure: process.env.NODE_ENV === 'production' });

export async function signup(f: FormData) {
  const email = s(f, 'email').toLowerCase(), pw = s(f, 'password');
  if (!email.includes('@') || pw.length < 8 || !s(f, 'store')) redirect('/signup?error=invalid');
  if (s(f, 'agree') !== 'on') redirect('/signup?error=agree');
  if (db().prepare('SELECT 1 FROM users WHERE email = ?').get(email)) redirect('/signup?error=exists');
  const { userId, recoveryCode } = createWorkspaceWithOwner(s(f, 'store'), email, s(f, 'name'), pw);
  await startSession(userId);
  await flash('akked_flash', recoveryCode);
  redirect('/welcome');
}

export async function login(f: FormData) {
  const email = s(f, 'email').toLowerCase(); const key = 'login:' + email;
  if (tooMany(key)) redirect('/login?error=locked');
  const u = db().prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!u || !verifyPassword(s(f, 'password'), u.password_hash)) { recordFail(key); redirect('/login?error=1'); }
  clearFails(key);
  await startSession(u.id);
  redirect('/confirm');
}

/** Forgot password without email: the one-time recovery code shown at signup. A new code is issued after use. */
export async function resetPassword(f: FormData) {
  const email = s(f, 'email').toLowerCase(); const key = 'reset:' + email;
  const pw = s(f, 'password');
  if (tooMany(key, 5)) redirect('/reset?error=locked');
  if (pw.length < 8) redirect('/reset?error=short');
  const u = db().prepare('SELECT id, recovery_hash FROM users WHERE email = ?').get(email) as any;
  if (!u?.recovery_hash || !verifyPassword(normalizeRecoveryCode(s(f, 'code')), u.recovery_hash)) { recordFail(key); redirect('/reset?error=1'); }
  clearFails(key); clearFails('login:' + email);
  const code = generateRecoveryCode();
  db().prepare('UPDATE users SET password_hash = ?, recovery_hash = ? WHERE id = ?').run(hashPassword(pw), hashPassword(normalizeRecoveryCode(code)), u.id);
  db().prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
  await startSession(u.id);
  await flash('akked_flash', code);
  redirect('/welcome');
}

/** Owner resets an agent's password: a temporary one is shown once. */
export async function resetAgentPassword(userId: number, _fd?: FormData) {
  const me = await requireOwner();
  const u = db().prepare('SELECT id, email, role FROM users WHERE id = ? AND workspace_id = ?').get(userId, me.workspaceId) as any;
  if (!u || u.role !== 'agent') redirect('/team');
  const pw = tempPassword();
  db().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(pw), u.id);
  db().prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
  await flash('akked_tmp', `${u.email}|${pw}`);
  redirect('/team');
}

export async function adminResetOwnerPassword(workspaceId: number, _fd?: FormData) {
  await requireAdmin();
  const u = db().prepare(`SELECT id, email FROM users WHERE workspace_id = ? AND role = 'owner' LIMIT 1`).get(workspaceId) as any;
  if (!u) redirect('/admin');
  const pw = tempPassword();
  db().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(pw), u.id);
  db().prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
  await flash('akked_tmp', `${u.email}|${pw}`);
  redirect('/admin');
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
  const me = await requireOwner();
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

export async function saveSheet(f: FormData) {
  const me = await requireOwner();
  const url = s(f, 'url');
  if (!url) { db().prepare('UPDATE workspaces SET sheet_url = NULL WHERE id = ?').run(me.workspaceId); redirect('/settings?sheet=off'); }
  if (!parseSheetUrl(url)) redirect('/settings?sheet=badurl');
  db().prepare('UPDATE workspaces SET sheet_url = ? WHERE id = ?').run(url.slice(0, 500), me.workspaceId);
  redirect('/settings?sheet=saved');
}

export async function syncSheetNow() {
  const me = await requireOwner();
  const r = await syncSheet(me.workspaceId);
  revalidatePath('/orders');
  redirect(`/settings?sheet=${r.ok ? 'synced-' + r.added : 'err-' + r.error}`);
}

const localStamp = (d: Date) => { const z = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; };

/** Called when the agent taps the WhatsApp button in the queue: new → message_sent. */
export async function markSent(id: number) {
  const me = await requireSession();
  const o = db().prepare('SELECT status FROM orders WHERE id = ? AND workspace_id = ?').get(id, me.workspaceId) as any;
  if (o?.status === 'new') changeStatus(me.workspaceId, me.userId, id, 'message_sent');
  revalidatePath('/confirm');
}

const laneOf = (l: string) => (['send', 'reply', 'call'].includes(l) ? l : 'reply');

/** One-tap result from the confirmation queue (bound per button: id, status, optional hours/"tomorrow", lane to return to). */
export async function quickStatus(id: number, status: string, hours: string, lane: string, _fd?: FormData) {
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
  redirect('/confirm?lane=' + laneOf(lane));
}

/** Cancel with a reason (one extra tap in the queue); reasons feed the dashboard. */
export async function quickCancel(id: number, reason: string, lane: string, _fd?: FormData) {
  const me = await requireSession();
  const r = (CANCEL_REASONS as readonly string[]).includes(reason) ? reason : 'unspecified';
  if (changeStatus(me.workspaceId, me.userId, Number(id), 'cancelled', null, 'reason: ' + r)) db().prepare('UPDATE orders SET cancel_reason = ? WHERE id = ? AND workspace_id = ?').run(r, Number(id), me.workspaceId);
  revalidatePath('/confirm');
  redirect('/confirm?lane=' + laneOf(lane));
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

/** One-tap status from the orders list; returns to the same filtered list. */
export async function listStatus(id: number, status: string, back: string, _fd?: FormData) {
  const me = await requireSession();
  if (['confirmed', 'cancelled', 'no_answer'].includes(status)) changeStatus(me.workspaceId, me.userId, id, status);
  revalidatePath('/orders');
  redirect(back.startsWith('/orders') ? back : '/orders');
}

/** Edit an order (bound with the order id). */
export async function updateOrderAction(id: number, f: FormData) {
  const me = await requireSession();
  const r = updateOrder(me.workspaceId, me.userId, id, Object.fromEntries(['customer_name', 'phone', 'city', 'address', 'products', 'size', 'color', 'quantity', 'price', 'notes'].map((k) => [k, s(f, k)])));
  if (!r.ok) redirect(`/orders/${id}/edit?error=${r.error}`);
  revalidatePath('/orders');
  redirect(s(f, 'back').startsWith('/') ? s(f, 'back') : `/orders/${id}`);
}

/** First-run helper: five sample orders so a new seller can try the flow immediately. */
export async function createDemoOrders() {
  const me = await requireSession();
  createOrders(me.workspaceId, me.userId, DEMO_ORDERS, 'demo');
  redirect('/confirm');
}

export async function submitPayment(f: FormData) {
  const me = await requireOwner();
  let proof = null;
  const file = f.get('proof');
  if (file instanceof File && file.size > 0) {
    proof = checkProof(new Uint8Array(await file.arrayBuffer()));
    if (!proof) redirect('/billing?error=proof');
  }
  const r = createPayment(me.workspaceId, { plan: s(f, 'plan'), method: s(f, 'method'), reference: s(f, 'reference'), note: s(f, 'note'), proof });
  if (!r.ok) redirect('/billing?error=' + r.error);
  redirect('/billing?sent=1');
}

export async function adminDecidePayment(id: number, approve: boolean, _fd?: FormData) {
  const me = await requireAdmin();
  decidePayment(id, approve, me.userId);
  revalidatePath('/admin');
  redirect('/admin');
}

export async function adminSaveSettings(f: FormData) {
  await requireAdmin();
  for (const k of SETTING_KEYS) setSetting(k, s(f, k).slice(0, 2000));
  redirect('/admin?saved=1');
}

export async function eraseCustomerAction(f: FormData) {
  const me = await requireOwner();
  const r = eraseCustomer(me.workspaceId, s(f, 'phone'));
  redirect(r.ok ? `/settings/data?erased=${r.orders}` : '/settings/data?error=phone');
}

export async function deleteAccountAction(f: FormData) {
  const me = await requireOwner();
  const ws = getWorkspace(me.workspaceId);
  if (s(f, 'confirm') !== ws.name) redirect('/settings/data?error=confirm');
  deleteWorkspace(me.workspaceId);
  (await cookies()).delete('akked_session');
  redirect('/login');
}

// ---------------- delivery companies (carriers) ----------------
/** Old binary .xls (OLE2) can't be read: ask the seller to re-save it as .xlsx or CSV. */
const isOldXls = (b: Uint8Array) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
/** Add AMEEX (or any built-in connector) with its credentials: API + the company's own export template. */
export async function addConnectorCarrier(connectorKey: string, f: FormData) {
  const me = await requireOwner();
  const conn = CONNECTORS[connectorKey]; if (!conn) redirect('/carriers');
  const creds: Record<string, string> = {};
  for (const fld of conn.fields) { creds[fld.key] = s(f, fld.key); if (!creds[fld.key]) redirect('/carriers/new?error=creds'); }
  const id = createFromPreset(me.workspaceId, connectorKey, creds);
  redirect(`/carriers/${id}?created=1`);
}

/** Any other company: upload its Excel/CSV template (or paste its column names) → we suggest the mapping. */
export async function addFileCarrier(f: FormData) {
  const me = await requireOwner();
  const name = s(f, 'name'); if (!name) redirect('/carriers/new?error=name');
  let bytes: Uint8Array | null = null; let filename = 'template.csv';
  const file = f.get('template');
  if (file instanceof File && file.size > 0) {
    if (file.size > 2_000_000) redirect('/carriers/new?error=big');
    bytes = new Uint8Array(await file.arrayBuffer()); filename = file.name;
  } else if (s(f, 'headers')) bytes = new TextEncoder().encode(s(f, 'headers').replace(/\n/g, ',').slice(0, 2000));
  if (!bytes) redirect('/carriers/new?error=file');
  if (isOldXls(bytes!)) redirect('/carriers/new?error=xls');
  const tpl = await readTemplate(bytes!, filename);
  if (!tpl) redirect('/carriers/new?error=parse');
  const columns: ColumnMap[] = tpl!.headers.map((h) => ({ col: h.col, header: h.header, source: suggestSource(h.header) }));
  const config: ExportConfig = { headerRow: tpl!.headerRow, columns, output: tpl!.kind };
  const id = createCarrier(me.workspaceId, { name, config, template: tpl!.kind === 'xlsx' ? bytes : null, templateName: tpl!.kind === 'xlsx' ? filename : null });
  redirect(`/carriers/${id}?created=1`);
}

export async function saveCarrierMapping(id: number, f: FormData) {
  const me = await requireOwner();
  const c = getCarrier(me.workspaceId, id); if (!c) redirect('/carriers');
  const columns: ColumnMap[] = c!.config.columns.map((col) => {
    const src = s(f, 'src_' + col.col); const source = ((SOURCES as readonly string[]).includes(src) ? src : 'empty') as Source;
    return { col: col.col, header: col.header, source, ...(source === 'fixed' ? { fixed: s(f, 'fixed_' + col.col).slice(0, 200) } : {}) };
  });
  const out = s(f, 'output') === 'csv' ? 'csv' : 'xlsx';
  setConfig(me.workspaceId, id, { headerRow: c!.config.headerRow, columns, output: out === 'xlsx' && !c!.has_template && c!.config.output === 'csv' ? 'csv' : out });
  renameCarrier(me.workspaceId, id, s(f, 'name') || c!.name);
  redirect(`/carriers/${id}?saved=1`);
}

export async function saveCarrierCities(id: number, f: FormData) {
  const me = await requireOwner();
  const r = setCities(me.workspaceId, id, s(f, 'cities'));
  redirect(`/carriers/${id}?cities=${r.saved}&unmatched=${encodeURIComponent(r.unmatched.slice(0, 15).join('|'))}`);
}

export async function saveCarrierCreds(id: number, f: FormData) {
  const me = await requireOwner();
  const c = getCarrier(me.workspaceId, id); const conn = c?.connector ? CONNECTORS[c.connector] : null;
  if (!c || !conn) redirect('/carriers');
  setCreds(me.workspaceId, id, Object.fromEntries(conn!.fields.map((fld) => [fld.key, s(f, fld.key)])));
  redirect(`/carriers/${id}?saved=1`);
}

export async function deleteCarrierAction(id: number, _fd?: FormData) {
  const me = await requireOwner();
  deleteCarrier(me.workspaceId, id);
  redirect('/carriers');
}

/** Send one confirmed order through a carrier's API. */
export async function sendViaCarrier(carrierId: number, f: FormData) {
  const me = await requireSession();
  const id = Number(s(f, 'id'));
  const r = await sendOrderViaCarrier(me.workspaceId, me.userId, id, carrierId);
  redirect(`/orders/${id}?ship=${r.ok ? 'ok' : r.error}`);
}

export async function bulkSendCarrier(carrierId: number, _fd?: FormData) {
  const me = await requireSession();
  const r = await bulkSend(me.workspaceId, me.userId, carrierId);
  const fails = r.failed.slice(0, 8).map((x) => `${x.order_number}:${x.error}`).join(',');
  redirect(`/orders?bulk=${r.sent}-${r.failed.length}${fails ? '&bf=' + encodeURIComponent(fails) : ''}`);
}

export async function trackNow() {
  const me = await requireOwner();
  const r = await trackWorkspace(me.workspaceId);
  redirect(`/orders?tracked=${r.checked}-${r.delivered}-${r.returned}`);
}

/** The company changed its model: upload the new file; the seller's column choices are kept for headers that still exist. */
export async function replaceCarrierTemplate(id: number, f: FormData) {
  const me = await requireOwner();
  const c = getCarrier(me.workspaceId, id); if (!c) redirect('/carriers');
  const file = f.get('template');
  if (!(file instanceof File) || file.size === 0) redirect(`/carriers/${id}?error=file`);
  if ((file as File).size > 2_000_000) redirect(`/carriers/${id}?error=big`);
  const bytes = new Uint8Array(await (file as File).arrayBuffer());
  if (isOldXls(bytes)) redirect(`/carriers/${id}?error=xls`);
  const tpl = await readTemplate(bytes, (file as File).name);
  if (!tpl) redirect(`/carriers/${id}?error=parse`);
  const { columns, added } = mergeMapping(c!.config.columns, tpl!.headers);
  setConfig(me.workspaceId, id, { headerRow: tpl!.headerRow, columns, output: tpl!.kind });
  setTemplate(me.workspaceId, id, tpl!.kind === 'xlsx' ? bytes : null, (file as File).name);
  redirect(`/carriers/${id}?replaced=${added}`);
}
