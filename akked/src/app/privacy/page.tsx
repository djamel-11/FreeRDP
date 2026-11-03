import { getT } from '@/lib/i18n';
import { getSession } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import { privacy } from '@/lib/legal';

export default async function Page() {
  const { l, t } = await getT(); const me = await getSession(); const doc = privacy(l);
  return (<div className="card legal"><h1>{doc.title}</h1>
    {me?.isAdmin && !getSetting('operator_name') && <div className="err">⚠ {t.legalDraft}</div>}
    {doc.sections.map((s) => <section key={s.h}><h2>{s.h}</h2>{s.p.map((x, i) => <p key={i}>{x}</p>)}</section>)}</div>);
}
