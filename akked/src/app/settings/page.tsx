import { requireOwner } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { getWorkspace } from '@/lib/orders';
import { DEFAULT_TEMPLATES } from '@/lib/templates';
import Link from 'next/link';
import { headers } from 'next/headers';
import ApkBridge from '../apk-bridge';
import { saveSheet, saveTemplates, saveWhatsapp, syncSheetNow } from '../actions';
export default async function Settings({ searchParams }: { searchParams: Promise<{ wa?: string; sheet?: string }> }) {
  const sp = await searchParams;
  const h = await headers(); const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  const me = await requireOwner(); const { t } = await getT(); const ws = getWorkspace(me.workspaceId) as any;
  return (<>
  <ApkBridge label={t.changeServer} />
  <p><Link className="btn sec" href="/settings/data">🔒 {t.myData}</Link></p><p><Link className="btn sec" href="/carriers">🚚 {t.carriers}</Link></p>
  <div className="card"><h1>{t.sheetTitle}</h1>
    {sp.sheet && <div className={sp.sheet.startsWith('err') || sp.sheet === 'badurl' ? 'err' : 'ok'}>{sp.sheet === 'badurl' ? t.sheetBad : sp.sheet === 'off' ? t.sheetOff : sp.sheet === 'saved' ? t.sheetSaved : sp.sheet.startsWith('synced-') ? `${t.sheetSynced}: ${sp.sheet.slice(7)}` : (t as any)['sheetErr_' + sp.sheet.slice(4)] ?? '✖'}</div>}
    <p className="muted">{t.sheetHint}</p>
    <form action={saveSheet}><label>{t.sheetUrlLbl}</label><input name="url" dir="ltr" defaultValue={ws.sheet_url ?? ''} placeholder="https://docs.google.com/spreadsheets/d/…" autoComplete="off" /><p><button>{t.save}</button></p></form>
    {ws.sheet_url && <form action={syncSheetNow}><button className="sec">🔄 {t.syncNow}</button> <span className="muted">{t.lastSync}: {ws.sheet_last_sync ? String(ws.sheet_last_sync).slice(0, 16).replace('T', ' ') : '—'} · {ws.sheet_last_result ?? ''}</span></form>}
  </div>
  <details className="card" open={!!sp.wa}><summary><strong>{t.advanced}</strong></summary><h1>{t.waSettings}</h1>
    {sp.wa && <div className={sp.wa === 'saved' || sp.wa === 'off' ? 'ok' : 'err'}>{sp.wa === 'saved' ? t.waSaved : sp.wa === 'taken' ? t.waTaken : sp.wa === 'off' ? '—' : '✖'}</div>}
    <p className="muted">{t.waWebhook}: <bdi dir="ltr">{origin}/api/whatsapp/webhook</bdi></p>
    {me.role === 'owner' ? <form action={saveWhatsapp}>
      <label>{t.waPhoneId}</label><input name="phone_number_id" defaultValue={ws.wa_phone_number_id ?? ''} dir="ltr" inputMode="numeric" autoComplete="off" />
      <label>{t.waToken}</label><input name="token" type="password" placeholder={ws.wa_token_enc ? '••••••••' : ''} dir="ltr" autoComplete="off" />
      <div className="row"><div><label>{t.waTemplate}</label><input name="template" defaultValue={ws.wa_template_name ?? 'order_confirmation'} dir="ltr" /></div>
        <div><label>{t.waLang}</label><input name="lang" defaultValue={ws.wa_template_lang ?? 'ar'} dir="ltr" /></div></div>
      <p className="muted">{t.vars}: {'{{1}} الاسم · {{2}} المنتج · {{3}} الثمن · {{4}} المدينة'}</p>
      <p><button>{t.save}</button></p></form> : <p className="muted">—</p>}
  </details>
  <div className="card"><h1>{t.myTemplates}</h1><p className="muted">{t.vars}: {'{name} {product} {price} {city}'}</p>
    <form action={saveTemplates}>
      {(['darija', 'ar', 'fr'] as const).map((k) => <div key={k}><label>{t[k === 'ar' ? 'arabic' : k === 'fr' ? 'french' : 'darija']}</label>
        <textarea name={k} rows={5} defaultValue={(ws as any)['template_' + k] || DEFAULT_TEMPLATES[k]} /></div>)}
      <p><button>{t.save}</button></p></form></div></>);
}
