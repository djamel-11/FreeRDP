'use server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { createWorkspaceWithOwner, hashPassword, requireAdmin, requireSession, startSession, verifyPassword } from '@/lib/auth';
import { normalizePhone } from '@/lib/phone';
import { parseOrders } from '@/lib/import';
import { changeStatus, createOrders, getWorkspace, teamMembers } from '@/lib/orders';
import { PLANS, type PlanKey } from '@/lib/plans';
import { STATUSES } from '@/lib/i18n';

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
  redirect('/orders');
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
