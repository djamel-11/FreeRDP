import { requireOwner } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { getWorkspace, monthlyUsage } from '@/lib/orders';
import { PLANS, isActive, type PlanKey } from '@/lib/plans';
import { daysLeft, PAYABLE_PLANS, METHODS, paymentsFor } from '@/lib/billing';
import { getSetting } from '@/lib/settings';
import { submitPayment } from '../actions';

export default async function Billing({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const me = await requireOwner(); const { t } = await getT(); const sp = await searchParams;
  const ws = getWorkspace(me.workspaceId); const plan = PLANS[ws.plan as PlanKey];
  const left = daysLeft(ws.period_end); const active = isActive(ws);
  const instr = getSetting('payment_instructions'); const wa = getSetting('support_whatsapp').replace(/\D/g, '');
  const hist = paymentsFor(me.workspaceId);
  const errMsg = sp.error ? (t as any)['payErr_' + sp.error] ?? '✖' : '';
  const lim = (n: number) => (n === Infinity ? t.unlimited : String(n));
  return (<>
    <h1>{t.billing}</h1>
    {sp.sent && <div className="ok">{t.paySent}</div>}
    {errMsg && <div className="err">{errMsg}</div>}
    <div className="card">
      <div className="top"><strong>{t.currentPlan}: {plan.name}</strong><span className={`badge ${active ? 'confirmed' : 'cancelled'}`}>{active ? '✔' : '✖'} {ws.status}</span></div>
      <p className="muted">{t.daysLeftLbl}: <b>{Math.max(0, left)}</b> · {t.usage}: {monthlyUsage(me.workspaceId)}/{lim(plan.orders)}</p>
    </div>
    <div className="plans">
      {PAYABLE_PLANS.map((k) => (<div key={k} className="card"><h2>{PLANS[k].name}</h2>
        <div className="kpi" dir="ltr">{PLANS[k].price} MAD</div>
        <p className="muted">{lim(PLANS[k].orders)} {t.ordersPerMonth}<br />{lim(PLANS[k].users)} {t.usersLbl}</p></div>))}
    </div>
    <div className="card"><h2>{t.howToPay}</h2>
      {instr ? <pre dir="auto">{instr}</pre> : <p className="muted">{t.noInstructions}</p>}
      {wa && <p><a className="btn sec" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">💬 {t.contactUs}</a></p>}
    </div>
    <div className="card"><h2>{t.paidForm}</h2>
      <form action={submitPayment}>
        <div className="row" style={{ gridTemplateColumns: '1fr' }}><div><label>{t.choosePlan}</label>
          <select name="plan" defaultValue={ws.plan === 'trial' ? 'starter' : ws.plan}>{PAYABLE_PLANS.map((k) => <option key={k} value={k}>{PLANS[k].name} — {PLANS[k].price} MAD</option>)}</select></div>
          <div><label>{t.payMethod}</label><select name="method">{METHODS.map((m) => <option key={m} value={m}>{(t as any)['m_' + m]}</option>)}</select></div></div>
        <label>{t.payRef}</label><input name="reference" required minLength={3} maxLength={120} />
        <label>{t.payNote}</label><input name="note" maxLength={300} />
        <label>{t.payProof}</label><input type="file" name="proof" accept="image/*,application/pdf" />
        <p><button>{t.sendPayment}</button></p></form></div>
    {hist.length > 0 && <div className="card"><h2>{t.payHistory}</h2>
      {hist.map((p) => <div key={p.id} className="o"><span dir="ltr">{PLANS[p.plan as PlanKey].name} · {p.amount} MAD</span> <span className={`badge ${p.status === 'approved' ? 'confirmed' : p.status === 'rejected' ? 'cancelled' : ''}`}>{(t as any)['p_' + p.status]}</span> <span className="muted">{(t as any)['m_' + p.method]} · {p.reference} · {String(p.created_at).slice(0, 10)}</span></div>)}</div>}
  </>);
}
