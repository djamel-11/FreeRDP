import { requireSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { getWorkspace } from '@/lib/orders';
import { DEFAULT_TEMPLATES } from '@/lib/templates';
import { headers } from 'next/headers';
import { saveAmeexCreds, saveTemplates, saveWhatsapp } from '../actions';
export default async function Settings({ searchParams }: { searchParams: Promise<{ ameex?: string; wa?: string }> }) {
  const sp = await searchParams;
  const h = await headers(); const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  const me = await requireSession(); const { t } = await getT(); const ws = getWorkspace(me.workspaceId) as any;
  return (<><div className="card"><h1>{t.ameexTitle}</h1>
    {sp.ameex && <div className="ok">{sp.ameex === 'off' ? t.ameexOff : t.ameexSaved}</div>}
    {me.role === 'owner' ? <form action={saveAmeexCreds}><label>{t.ameexId}</label><input name="api_id" defaultValue={ws.ameex_api_id ?? ''} dir="ltr" autoComplete="off" />
      <label>{t.ameexKey}</label><input name="api_key" type="password" placeholder={ws.ameex_api_key_enc ? '••••••••' : ''} dir="ltr" autoComplete="off" /><p><button>{t.save}</button></p></form> : <p className="muted">—</p>}
  </div>
  <div className="card"><h1>{t.waSettings}</h1>
    {sp.wa && <div className={sp.wa === 'saved' || sp.wa === 'off' ? 'ok' : 'err'}>{sp.wa === 'saved' ? t.waSaved : sp.wa === 'taken' ? t.waTaken : sp.wa === 'off' ? '—' : '✖'}</div>}
    <p className="muted">{t.waWebhook}: <bdi dir="ltr">{origin}/api/whatsapp/webhook</bdi></p>
    {me.role === 'owner' ? <form action={saveWhatsapp}>
      <label>{t.waPhoneId}</label><input name="phone_number_id" defaultValue={ws.wa_phone_number_id ?? ''} dir="ltr" inputMode="numeric" autoComplete="off" />
      <label>{t.waToken}</label><input name="token" type="password" placeholder={ws.wa_token_enc ? '••••••••' : ''} dir="ltr" autoComplete="off" />
      <div className="row"><div><label>{t.waTemplate}</label><input name="template" defaultValue={ws.wa_template_name ?? 'order_confirmation'} dir="ltr" /></div>
        <div><label>{t.waLang}</label><input name="lang" defaultValue={ws.wa_template_lang ?? 'ar'} dir="ltr" /></div></div>
      <p className="muted">{t.vars}: {'{{1}} الاسم · {{2}} المنتج · {{3}} الثمن · {{4}} المدينة'}</p>
      <p><button>{t.save}</button></p></form> : <p className="muted">—</p>}
  </div>
  <div className="card"><h1>{t.myTemplates}</h1><p className="muted">{t.vars}: {'{name} {product} {price} {city}'}</p>
    <form action={saveTemplates}>
      {(['darija', 'ar', 'fr'] as const).map((k) => <div key={k}><label>{t[k === 'ar' ? 'arabic' : k === 'fr' ? 'french' : 'darija']}</label>
        <textarea name={k} rows={5} defaultValue={(ws as any)['template_' + k] || DEFAULT_TEMPLATES[k]} /></div>)}
      <p><button>{t.save}</button></p></form></div></>);
}
