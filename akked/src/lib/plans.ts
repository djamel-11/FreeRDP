export type PlanKey = 'trial' | 'starter' | 'pro' | 'business';
export const PLANS: Record<PlanKey, { name: string; price: number; orders: number; users: number }> = {
  trial: { name: 'Trial', price: 0, orders: 300, users: 1 },
  starter: { name: 'Starter', price: 99, orders: 300, users: 1 },
  pro: { name: 'Pro', price: 249, orders: 1500, users: 3 },
  business: { name: 'Business', price: 499, orders: Infinity, users: Infinity },
};
export const TRIAL_DAYS = 14;

export interface WorkspaceState { plan: PlanKey; status: string; period_end: string | null }

/** Is the subscription currently usable? */
export function isActive(w: WorkspaceState, now = new Date()): boolean {
  if (w.status === 'suspended') return false;
  if (!w.period_end) return false;
  return new Date(w.period_end) > now;
}

export function canAddOrders(w: WorkspaceState, usedThisMonth: number, adding = 1, now = new Date()): { ok: boolean; reason?: 'expired' | 'limit' } {
  if (!isActive(w, now)) return { ok: false, reason: 'expired' };
  if (usedThisMonth + adding > PLANS[w.plan].orders) return { ok: false, reason: 'limit' };
  return { ok: true };
}
