import { requireSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { getWorkspace } from '@/lib/orders';
import { DEFAULT_TEMPLATES } from '@/lib/templates';
import { saveAmeexCreds, saveTemplates } from '../actions';
export default async function Settings({ searchParams }: { searchParams: Promise<{ ameex?: string }> }) {
  const sp = await searchParams;
  const me = await requireSession(); const { t } = await getT(); const ws = getWorkspace(me.workspaceId) as any;
  return (<><div className="card"><h1>{t.ameexTitle}</h1>
    {sp.ameex && <div className="ok">{sp.ameex === 'off' ? t.ameexOff : t.ameexSaved}</div>}
    {me.role === 'owner' ? <form action={saveAmeexCreds}><label>{t.ameexId}</label><input name="api_id" defaultValue={ws.ameex_api_id ?? ''} dir="ltr" autoComplete="off" />
      <label>{t.ameexKey}</label><input name="api_key" type="password" placeholder={ws.ameex_api_key_enc ? '••••••••' : ''} dir="ltr" autoComplete="off" /><p><button>{t.save}</button></p></form> : <p className="muted">—</p>}
  </div><div className="card"><h1>{t.myTemplates}</h1><p className="muted">{t.vars}: {'{name} {product} {price} {city}'}</p>
    <form action={saveTemplates}>
      {(['darija', 'ar', 'fr'] as const).map((k) => <div key={k}><label>{t[k === 'ar' ? 'arabic' : k === 'fr' ? 'french' : 'darija']}</label>
        <textarea name={k} rows={5} defaultValue={(ws as any)['template_' + k] || DEFAULT_TEMPLATES[k]} /></div>)}
      <p><button>{t.save}</button></p></form></div></>);
}
