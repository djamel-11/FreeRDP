import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { getT, STATUSES } from '@/lib/i18n';
import { getWorkspace, listOrders, unmatchedCities, monthlyUsage, teamMembers, PLANS, type PlanKey } from '@/lib/orders';
import { isActive } from '@/lib/plans';
import { db } from '@/lib/db';

export default async function Orders({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireSession(); const { t } = await getT(); const sp = await searchParams;
  const ws = getWorkspace(me.workspaceId);
  const rows = listOrders(me.workspaceId, sp);
  const agents = teamMembers(me.workspaceId);
  const cities = db().prepare(`SELECT DISTINCT city FROM orders WHERE workspace_id = ? AND city <> '' ORDER BY city`).all(me.workspaceId) as any[];
  const badCities = unmatchedCities(me.workspaceId);
  const used = monthlyUsage(me.workspaceId); const lim = PLANS[ws.plan as PlanKey].orders;
  return (<>
    {!isActive(ws) && <div className="err">{t.expired}</div>}
    {badCities.length > 0 && <div className="err">⚠ {t.cityWarn}: {badCities.map((b) => <Link key={b.id} href={`/orders/${b.id}`}>{b.order_number} ({b.city || '—'}) </Link>)}</div>}
    <div className="inline" style={{ marginBottom: 12 }}>
      <Link className="btn" href="/orders/new">+ {t.newOrder}</Link>
      <Link className="btn sec" href="/orders/import">{t.import}</Link>
      <a className="btn sec" href="/export?format=ameex">{t.export} AMEEX (xlsx)</a>
      <a className="btn sec" href="/export?format=generic">{t.export} CSV</a>
    </div>
    <p className="muted">{t.plan}: {PLANS[ws.plan as PlanKey].name} · {t.usage}: {used}/{lim === Infinity ? '∞' : lim}</p>
    <form className="card inline" method="get">
      <input name="q" placeholder={t.search} defaultValue={sp.q} />
      <select name="status" defaultValue={sp.status ?? ''}><option value="">{t.status}: {t.all}</option>{STATUSES.map((s) => <option key={s} value={s}>{(t as any)['s_' + s]}</option>)}</select>
      <select name="city" defaultValue={sp.city ?? ''}><option value="">{t.city}: {t.all}</option>{cities.map((c) => <option key={c.city}>{c.city}</option>)}</select>
      <select name="agent" defaultValue={sp.agent ?? ''}><option value="">{t.agent}: {t.all}</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}</select>
      <div><label>{t.from}</label><input type="date" name="from" defaultValue={sp.from} /></div>
      <div><label>{t.to}</label><input type="date" name="to" defaultValue={sp.to} /></div>
      <div style={{ flexBasis: '100%' }}><button className="sec" style={{ width: '100%' }}>{t.filter}</button></div>
    </form>
    <div className="card">
      {rows.length === 0 && <p className="muted">{t.none}</p>}
      {rows.map((o) => (
        <Link key={o.id} href={`/orders/${o.id}`} className="o">
          <div className="top"><bdi className="nm">{o.customer_name}</bdi><span className="price" dir="ltr">{o.price} MAD</span></div>
          <div className="tags">
            <span className={`badge ${o.status}`}>{(t as any)['s_' + o.status]}</span>
            {o.refusals > 0 && <span className="badge bad">⚠ {t.refusedBefore}{o.refusals > 1 ? ` ×${o.refusals}` : ''}</span>}
          </div>
          <div className="muted"><bdi dir="ltr">{o.phone}</bdi> · {o.city}</div>
          <div className="muted"><bdi dir="auto">{o.quantity}× {o.products} {o.size} {o.color}</bdi></div>
        </Link>))}
    </div></>);
}
