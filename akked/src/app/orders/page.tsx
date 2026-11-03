import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { getT, STATUSES } from '@/lib/i18n';
import { getWorkspace, listOrders, unmatchedCities, monthlyUsage, teamMembers, PLANS, type PlanKey } from '@/lib/orders';
import { isActive } from '@/lib/plans';
import { db } from '@/lib/db';
import { bulkSendAmeex, listStatus, trackAmeexNow } from '../actions';
import Onboarding from '../onboarding';

export default async function Orders({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireSession(); const { t } = await getT(); const sp = await searchParams;
  const ws = getWorkspace(me.workspaceId);
  const rows = listOrders(me.workspaceId, sp);
  const keep = Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && !['added', 'skipped'].includes(k)));
  const back = '/orders' + (Object.keys(keep).length ? '?' + new URLSearchParams(keep).toString() : '');
  const agents = teamMembers(me.workspaceId);
  const cities = db().prepare(`SELECT DISTINCT city FROM orders WHERE workspace_id = ? AND city <> '' ORDER BY city`).all(me.workspaceId) as any[];
  const badCities = unmatchedCities(me.workspaceId);
  const unsent = (db().prepare(`SELECT COUNT(*) c FROM orders WHERE workspace_id = ? AND status = 'confirmed' AND ameex_parcel_code IS NULL`).get(me.workspaceId) as any).c as number;
  const shipped = (db().prepare(`SELECT COUNT(*) c FROM orders WHERE workspace_id = ? AND status = 'shipped' AND ameex_parcel_code IS NOT NULL AND ameex_parcel_code <> 'SENT'`).get(me.workspaceId) as any).c as number;
  const [bs, bf] = (sp.bulk ?? '').split('-'); const [tc, td, tr] = (sp.tracked ?? '').split('-');
  const used = monthlyUsage(me.workspaceId); const lim = PLANS[ws.plan as PlanKey].orders;
  return (<>
    <Onboarding wsId={me.workspaceId} t={t as any} />
    {sp.bulk && <div className={bf === '0' ? 'ok' : 'err'}>{t.bulkSent}: {bs} · {t.bulkFailed}: {bf}{sp.bf ? ' — ' + sp.bf.split(',').map((x) => { const [n, e] = x.split(':'); return `${n} (${(t as any)['ameex_' + e] ?? e})`; }).join(' · ') : ''}</div>}
    {sp.tracked && <div className="ok">{t.trackedN}: {tc} · {t.deliveredLbl}: {td} · {t.returnedLbl}: {tr}</div>}
    {sp.added && <div className="ok">{t.added}: {sp.added}{sp.skipped && sp.skipped !== '0' ? ` · ${t.skipped}: ${sp.skipped}` : ''}</div>}
    {!isActive(ws) && <div className="err">{t.expired}</div>}
    {badCities.length > 0 && <div className="err">⚠ {t.cityWarn}: {badCities.map((b) => <Link key={b.id} href={`/orders/${b.id}`}>{b.order_number} ({b.city || '—'}) </Link>)}</div>}
    <div className="inline" style={{ marginBottom: 12 }}>
      <Link className="btn" href="/orders/quick">+ {t.quickAdd}</Link>
      <Link className="btn sec" href="/confirm">{t.startConfirm}</Link>
      <Link className="btn sec" href="/orders/import">{t.import}</Link>
      <Link className="btn sec" href="/orders/new">{t.fullForm}</Link>
      {me.role === 'owner' && <><a className="btn sec" href="/export?format=ameex">{t.export} AMEEX (xlsx)</a>
      <a className="btn sec" href="/export?format=generic">{t.export} CSV</a></>}
    </div>
    {(unsent > 0 || (shipped > 0 && me.role === 'owner')) && <div className="inline" style={{ marginBottom: 12 }}>
      {unsent > 0 && <form action={bulkSendAmeex}><button>🚚 {t.bulkSend} ({unsent})</button></form>}
      {shipped > 0 && me.role === 'owner' && <form action={trackAmeexNow}><button className="sec">🔄 {t.trackNow} ({shipped})</button></form>}
    </div>}
    <p className="muted">{t.plan}: {PLANS[ws.plan as PlanKey].name} · {t.usage}: {used}/{lim === Infinity ? '∞' : lim}</p>
    <details className="card" open={Object.keys(keep).length > 0}><summary><strong>🔎 {t.search} / {t.filter}</strong></summary>
    <form className="inline" method="get" style={{ marginTop: 8 }}>
      <input name="q" placeholder={t.search} defaultValue={sp.q} />
      <select name="status" defaultValue={sp.status ?? ''}><option value="">{t.status}: {t.all}</option>{STATUSES.map((s) => <option key={s} value={s}>{(t as any)['s_' + s]}</option>)}</select>
      <select name="city" defaultValue={sp.city ?? ''}><option value="">{t.city}: {t.all}</option>{cities.map((c) => <option key={c.city}>{c.city}</option>)}</select>
      <select name="agent" defaultValue={sp.agent ?? ''}><option value="">{t.agent}: {t.all}</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}</select>
      <div><label>{t.from}</label><input type="date" name="from" defaultValue={sp.from} /></div>
      <div><label>{t.to}</label><input type="date" name="to" defaultValue={sp.to} /></div>
      <div style={{ flexBasis: '100%' }}><button className="sec" style={{ width: '100%' }}>{t.filter}</button></div>
    </form></details>
    <div className="card">
      {rows.length === 0 && <p className="muted">{t.none}</p>}
      {rows.map((o) => (
        <div key={o.id} className="o">
          <Link href={`/orders/${o.id}`} className="plain">
            <div className="top"><bdi className="nm">{o.customer_name}</bdi><span className="price" dir="ltr">{o.price} MAD</span></div>
            <div className="tags">
              <span className={`badge ${o.status}`}>{(t as any)['s_' + o.status]}</span>
              {o.refusals > 0 && <span className="badge bad">⚠ {t.refusedBefore}{o.refusals > 1 ? ` ×${o.refusals}` : ''}</span>}
              {o.ameex_status && <span className="badge">🚚 {o.ameex_status}</span>}
            </div>
            <div className="muted"><bdi dir="ltr">{o.phone}</bdi> · {o.city}</div>
            <div className="muted"><bdi dir="auto">{o.quantity}× {o.products} {o.size} {o.color}</bdi></div>
          </Link>
          {['new', 'message_sent', 'no_answer', 'callback'].includes(o.status) && (
            <div className="acts">
              <form action={listStatus.bind(null, o.id, 'confirmed', back)}><button className="mini ok">{t.btnConfirm}</button></form>
              <form action={listStatus.bind(null, o.id, 'cancelled', back)}><button className="mini danger">{t.btnCancel}</button></form>
              <form action={listStatus.bind(null, o.id, 'no_answer', back)}><button className="mini sec">{t.btnNoAnswer}</button></form>
            </div>)}
        </div>))}
    </div></>);
}
