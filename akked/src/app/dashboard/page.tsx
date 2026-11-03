import { requireOwner } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { stats } from '@/lib/orders';
export default async function Dashboard() {
  const me = await requireOwner(); const { t } = await getT(); const s = stats(me.workspaceId);
  const max = Math.max(1, ...s.perDay.map((d) => d.c)); const maxC = Math.max(1, ...s.cities.map((d) => d.c));
  const pct = (n: number) => Math.round(n * 100) + '%';
  return (<><h1>{t.dashboard}</h1>
    <div className="row"><div className="card"><div className="muted">{t.orders}</div><div className="kpi">{s.total}</div></div>
      <div className="card"><div className="muted">{t.confirmRate}</div><div className="kpi">{pct(s.confirmRate)}</div></div>
      <div className="card"><div className="muted">{t.refusalRate}</div><div className="kpi">{pct(s.refusalRate)}</div></div></div>
    <div className="card"><h2>{t.ordersPerDay}</h2>{s.perDay.length === 0 && <p className="muted">{t.none}</p>}
      {s.perDay.map((d) => <div key={d.day} className="inline" style={{ flexWrap: 'nowrap', alignItems: 'center' }}><span dir="ltr" className="muted" style={{ flex: '0 0 90px' }}>{d.day}</span><div className="bar" style={{ width: `${(d.c / max) * 100}%`, flex: 'none' }} /><span>{d.c}</span></div>)}</div>
    <div className="card"><h2>{t.topCities}</h2>
      {s.cities.map((c) => <div key={c.city} className="inline" style={{ flexWrap: 'nowrap', alignItems: 'center' }}><span style={{ flex: '0 0 90px' }}>{c.city}</span><div className="bar" style={{ width: `${(c.c / maxC) * 100}%`, flex: 'none' }} /><span>{c.c}</span></div>)}</div>
    <div className="card"><h2>{t.agents}</h2><table><tbody>{s.agents.map((a) => <tr key={a.name}><td>{a.name}</td><td>{a.handled}</td><td>{a.confirmed}</td></tr>)}</tbody></table></div></>);
}
