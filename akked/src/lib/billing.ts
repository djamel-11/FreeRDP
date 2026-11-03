import { db } from './db';
import { PLANS, type PlanKey } from './plans';

export const METHODS = ['bank', 'cashplus', 'wafacash', 'other'] as const;
export const PAYABLE_PLANS: PlanKey[] = ['starter', 'pro', 'business'];
export const PERIOD_DAYS = 30;

export function daysLeft(periodEnd: string | null, now = new Date()): number {
  if (!periodEnd) return 0;
  return Math.ceil((new Date(periodEnd).getTime() - now.getTime()) / 864e5);
}

/** New period end when a payment is approved: extends from the current end if still active, else from today. */
export function extendedPeriodEnd(currentEnd: string | null, status: string, now = new Date()): string {
  const base = currentEnd && status !== 'suspended' && new Date(currentEnd) > now ? new Date(currentEnd) : now;
  return new Date(base.getTime() + PERIOD_DAYS * 864e5).toISOString();
}

export interface ProofFile { bytes: Uint8Array; mime: string }
/** Accept only images/PDF up to 2 MB, verified by magic bytes (the browser-supplied type is not trusted). */
export function checkProof(bytes: Uint8Array): ProofFile | null {
  if (bytes.length === 0 || bytes.length > 2_000_000) return null;
  const h = (...b: number[]) => b.every((x, i) => bytes[i] === x);
  if (h(0xff, 0xd8, 0xff)) return { bytes, mime: 'image/jpeg' };
  if (h(0x89, 0x50, 0x4e, 0x47)) return { bytes, mime: 'image/png' };
  if (h(0x25, 0x50, 0x44, 0x46)) return { bytes, mime: 'application/pdf' };
  if (h(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45) return { bytes, mime: 'image/webp' };
  return null;
}

export function createPayment(wsId: number, input: { plan: string; method: string; reference: string; note?: string; proof?: ProofFile | null }):
  { ok: boolean; error?: 'plan' | 'method' | 'reference' | 'pending' } {
  if (!PAYABLE_PLANS.includes(input.plan as PlanKey)) return { ok: false, error: 'plan' };
  if (!METHODS.includes(input.method as any)) return { ok: false, error: 'method' };
  const ref = input.reference.trim();
  if (ref.length < 3) return { ok: false, error: 'reference' };
  const pending = (db().prepare(`SELECT COUNT(*) c FROM payments WHERE workspace_id = ? AND status = 'pending'`).get(wsId) as any).c;
  if (pending >= 3) return { ok: false, error: 'pending' };
  db().prepare(`INSERT INTO payments (workspace_id, plan, amount, method, reference, note, proof, proof_mime) VALUES (?,?,?,?,?,?,?,?)`)
    .run(wsId, input.plan, PLANS[input.plan as PlanKey].price, input.method, ref.slice(0, 120), (input.note ?? '').slice(0, 300), input.proof?.bytes ?? null, input.proof?.mime ?? null);
  return { ok: true };
}

export function decidePayment(id: number, approve: boolean, adminId: number, now = new Date()): boolean {
  const p = db().prepare(`SELECT * FROM payments WHERE id = ? AND status = 'pending'`).get(id) as any;
  if (!p) return false;
  const d = db();
  d.transaction(() => {
    if (approve) {
      const w = d.prepare('SELECT period_end, status FROM workspaces WHERE id = ?').get(p.workspace_id) as any;
      d.prepare(`UPDATE workspaces SET plan = ?, status = 'active', period_end = ? WHERE id = ?`).run(p.plan, extendedPeriodEnd(w.period_end, w.status, now), p.workspace_id);
    }
    d.prepare(`UPDATE payments SET status = ?, decided_at = CURRENT_TIMESTAMP, decided_by = ? WHERE id = ?`).run(approve ? 'approved' : 'rejected', adminId, id);
  })();
  return true;
}

export const paymentsFor = (wsId: number) =>
  db().prepare(`SELECT id, plan, amount, method, reference, status, created_at, (proof IS NOT NULL) AS has_proof FROM payments WHERE workspace_id = ? ORDER BY id DESC LIMIT 20`).all(wsId) as any[];
export const pendingPayments = () =>
  db().prepare(`SELECT p.id, p.plan, p.amount, p.method, p.reference, p.note, p.created_at, (p.proof IS NOT NULL) AS has_proof, w.name AS shop, w.id AS workspace_id
    FROM payments p JOIN workspaces w ON w.id = p.workspace_id WHERE p.status = 'pending' ORDER BY p.id ASC`).all() as any[];
export const pendingCount = () => (db().prepare(`SELECT COUNT(*) c FROM payments WHERE status = 'pending'`).get() as any).c as number;
