import { requireSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { getWorkspace } from '@/lib/orders';
import { DEFAULT_TEMPLATES } from '@/lib/templates';
import { saveTemplates } from '../actions';
export default async function Settings() {
  const me = await requireSession(); const { t } = await getT(); const ws = getWorkspace(me.workspaceId);
  return (<div className="card"><h1>{t.myTemplates}</h1><p className="muted">{t.vars}: {'{name} {product} {price} {city}'}</p>
    <form action={saveTemplates}>
      {(['darija', 'ar', 'fr'] as const).map((k) => <div key={k}><label>{t[k === 'ar' ? 'arabic' : k === 'fr' ? 'french' : 'darija']}</label>
        <textarea name={k} rows={5} defaultValue={(ws as any)['template_' + k] || DEFAULT_TEMPLATES[k]} /></div>)}
      <p><button>{t.save}</button></p></form></div>);
}
