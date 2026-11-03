import ClearFlash from '../clear-flash';
import { requireAdmin } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { db } from '@/lib/db';
import { monthlyUsage } from '@/lib/orders';
import { PLANS, type PlanKey } from '@/lib/plans';
import { pendingPayments } from '@/lib/billing';
import { getSetting } from '@/lib/settings';
import { cookies } from 'next/headers';
import { adminDecidePayment, adminResetOwnerPassword, adminSaveSettings, adminSetSubscription } from '../actions';
export default async function Admin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const tmp = (await cookies()).get('akked_tmp')?.value?.split('|');
  const pay = pendingPayments();
  await requireAdmin(); const { t } = await getT();
  const list = db().prepare(`SELECT w.*, (SELECT email FROM users WHERE workspace_id = w.id AND role='owner' LIMIT 1) owner,
    (SELECT COUNT(*) FROM users WHERE workspace_id = w.id) users FROM workspaces w ORDER BY id DESC`).all() as any[];
  return (<>{tmp && <div className="ok"><ClearFlash />{t.tempShown}: <bdi dir="ltr">{tmp[0]} / <b>{tmp[1]}</b></bdi></div>}
    <h1>{t.admin}</h1>
    {sp.saved && <div className="ok">✔</div>}
    <div className="card"><h2>{t.pendingPay} ({pay.length})</h2>
      {pay.length === 0 && <p className="muted">{t.none}</p>}
      {pay.map((p) => <div key={p.id} className="o">
        <div className="top"><strong>{p.shop}</strong><span dir="ltr">{PLANS[p.plan as PlanKey].name} · {p.amount} MAD</span></div>
        <div className="muted">{(t as any)['m_' + p.method]} · <bdi>{p.reference}</bdi> · {String(p.created_at).slice(0, 16)}{p.note ? ` · ${p.note}` : ''}</div>
        <div className="acts">{p.has_proof ? <a className="btn sec mini" href={`/admin/proof/${p.id}`} target="_blank" rel="noopener noreferrer">{t.proofView}</a> : null}
          <form action={adminDecidePayment.bind(null, p.id, true)}><button className="mini ok">{t.approve}</button></form>
          <form action={adminDecidePayment.bind(null, p.id, false)}><button className="mini danger">{t.reject}</button></form></div></div>)}
    </div>
    <div className="card"><h2>{t.adminSettings}</h2>
      <form action={adminSaveSettings}>
        <label>{t.payInstr}</label><textarea name="payment_instructions" rows={5} defaultValue={getSetting('payment_instructions')} />
        <label>{t.supportWa}</label><input name="support_whatsapp" dir="ltr" defaultValue={getSetting('support_whatsapp')} placeholder="+2126XXXXXXXX" />
        <div className="row"><div><label>{t.operatorName}</label><input name="operator_name" defaultValue={getSetting('operator_name')} /></div>
          <div><label>{t.operatorContact}</label><input name="operator_contact" defaultValue={getSetting('operator_contact')} /></div>
          <div><label>{t.jurisdiction}</label><input name="jurisdiction" defaultValue={getSetting('jurisdiction')} /></div></div>
        <p><button>{t.save}</button></p></form>
      <p className="muted">{t.backupHint}</p><p><a className="btn sec" href="/admin/backup">⬇ {t.downloadBackup}</a></p></div>

    {list.map((w) => (
    <div className="card" key={w.id}><strong>{w.name}</strong> <span className="badge">{w.status}</span>
      <div className="muted">{w.owner} · {w.plan} · {t.usage}: {monthlyUsage(w.id)} · users: {w.users} · {t.periodEnd}: {String(w.period_end).slice(0, 10)}</div>
      <form action={adminSetSubscription} className="inline" style={{ marginTop: 8 }}><input type="hidden" name="id" value={w.id} />
        <select name="plan" defaultValue={w.plan}>{Object.keys(PLANS).map((p) => <option key={p}>{p}</option>)}</select>
        <input name="days" type="number" defaultValue={30} /><button name="action" value="activate">{t.activate}</button>
        <button name="action" value="suspend" className="danger">{t.suspend}</button></form>
      <form action={adminResetOwnerPassword.bind(null, w.id)} style={{ marginTop: 6 }}><button className="sec mini" style={{ width: 'auto' }}>{t.resetAgentPw}</button></form></div>))}</>);
}
