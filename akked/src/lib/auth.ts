import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
import { TRIAL_DAYS } from './plans';

export interface Session { userId: number; workspaceId: number; role: string; isAdmin: boolean; fullName: string; email: string }

export { hashPassword, verifyPassword } from './password';
import { hashPassword, generateRecoveryCode, normalizeRecoveryCode } from './password';

export function createWorkspaceWithOwner(name: string, email: string, fullName: string, pw: string): { userId: number; recoveryCode: string } {
  const recoveryCode = generateRecoveryCode();
  const d = db();
  const tx = d.transaction(() => {
    const end = new Date(Date.now() + TRIAL_DAYS * 864e5).toISOString();
    const ws = d.prepare(`INSERT INTO workspaces (name, plan, status, period_end) VALUES (?, 'trial', 'trial', ?)`).run(name, end);
    const isAdmin = process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.toLowerCase() === email.toLowerCase() ? 1 : 0;
    const u = d.prepare(`INSERT INTO users (workspace_id, email, full_name, password_hash, role, is_admin, recovery_hash) VALUES (?,?,?,?, 'owner', ?, ?)`)
      .run(ws.lastInsertRowid, email.toLowerCase(), fullName, hashPassword(pw), isAdmin, hashPassword(normalizeRecoveryCode(recoveryCode)));
    return Number(u.lastInsertRowid);
  });
  return { userId: tx(), recoveryCode };
}

export async function startSession(userId: number) {
  const token = crypto.randomBytes(32).toString('hex');
  db().prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)`)
    .run(token, userId, new Date(Date.now() + 30 * 864e5).toISOString());
  (await cookies()).set('akked_session', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 30 * 86400, secure: process.env.NODE_ENV === 'production' });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get('akked_session')?.value;
  if (!token) return null;
  const r = db().prepare(`SELECT u.id, u.workspace_id, u.role, u.is_admin, u.full_name, u.email, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`).get(token) as any;
  if (!r || new Date(r.expires_at) < new Date()) return null;
  return { userId: r.id, workspaceId: r.workspace_id, role: r.role, isAdmin: !!r.is_admin, fullName: r.full_name, email: r.email };
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect('/login');
  return s;
}
export async function requireAdmin(): Promise<Session> {
  const s = await requireSession();
  if (!s.isAdmin) redirect('/orders');
  return s;
}

/** Owner-only pages (agents are redirected). Platform admins pass too. */
export async function requireOwner(): Promise<Session> {
  const s = await requireSession();
  if (s.role !== 'owner' && !s.isAdmin) redirect('/orders');
  return s;
}
