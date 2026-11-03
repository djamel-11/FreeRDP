import ClearFlash from '../clear-flash';
import { requireAdmin } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { db } from '@/lib/db';
import { monthlyUsage } from '@/lib/orders';
import { PLANS } from '@/lib/plans';
import { cookies } from 'next/headers';
import { adminImportCityIds, adminResetOwnerPassword, adminSetSubscription } from '../actions';
export default async function Admin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const tmp = (await cookies()).get('akked_tmp')?.value?.split('|');
  const nIds = (db().prepare('SELECT COUNT(*) c FROM ameex_cities').get() as any).c;
  await requireAdmin(); const { t } = await getT();
  const list = db().prepare(`SELECT w.*, (SELECT email FROM users WHERE workspace_id = w.id AND role='owner' LIMIT 1) owner,
    (SELECT COUNT(*) FROM users WHERE workspace_id = w.id) users FROM workspaces w ORDER BY id DESC`).all() as any[];
  return (<>{tmp && <div className="ok"><ClearFlash />{t.tempShown}: <bdi dir="ltr">{tmp[0]} / <b>{tmp[1]}</b></bdi></div>}
    <h1>{t.admin}</h1>
    <div className="card"><h2>AMEEX city IDs ({nIds})</h2>
      {sp.cities_ok && <div className="ok">OK: {sp.cities_ok}{sp.cities_bad ? ` · unmatched: ${sp.cities_bad}` : ''}</div>}
      <form action={adminImportCityIds}><textarea name="text" rows={5} dir="ltr" placeholder={'1,Casablanca\n2,Rabat'} /><p><button>Import</button></p></form></div>
    {list.map((w) => (
    <div className="card" key={w.id}><strong>{w.name}</strong> <span className="badge">{w.status}</span>
      <div className="muted">{w.owner} · {w.plan} · {t.usage}: {monthlyUsage(w.id)} · users: {w.users} · {t.periodEnd}: {String(w.period_end).slice(0, 10)}</div>
      <form action={adminSetSubscription} className="inline" style={{ marginTop: 8 }}><input type="hidden" name="id" value={w.id} />
        <select name="plan" defaultValue={w.plan}>{Object.keys(PLANS).map((p) => <option key={p}>{p}</option>)}</select>
        <input name="days" type="number" defaultValue={30} /><button name="action" value="activate">{t.activate}</button>
        <button name="action" value="suspend" className="danger">{t.suspend}</button></form>
      <form action={adminResetOwnerPassword.bind(null, w.id)} style={{ marginTop: 6 }}><button className="sec mini" style={{ width: 'auto' }}>{t.resetAgentPw}</button></form></div>))}</>);
}
