import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { cityCount, listCarriers } from '@/lib/carriers';

export default async function Carriers() {
  const me = await requireOwner(); const { t } = await getT();
  const list = listCarriers(me.workspaceId);
  return (<><h1>{t.carriers}</h1><p className="muted">{t.carriersHint}</p>
    <p><Link className="btn" href="/carriers/new">+ {t.addCarrier}</Link></p>
    {list.length === 0 && <div className="card"><p className="muted">{t.noCarriers}</p></div>}
    {list.map((c) => (
      <Link key={c.id} href={`/carriers/${c.id}`} className="card plain" style={{ display: 'block' }}>
        <div className="top"><strong className="nm">{c.name}</strong><span className={`badge ${c.connector ? 'confirmed' : ''}`}>{c.connector ? '⚡ ' + t.connected : '📄 ' + t.fileOnly}</span></div>
        <div className="muted">{c.config.columns.length} {t.editMapping} · {t.citiesTitle}: {cityCount(c.id)}</div>
      </Link>))}
  </>);
}
