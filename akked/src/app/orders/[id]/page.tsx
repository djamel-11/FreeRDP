import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { getT, STATUSES } from '@/lib/i18n';
import { customerHistory, getOrder, getWorkspace } from '@/lib/orders';
import { buildMessage, waLink } from '@/lib/templates';
import { sendViaCarrier, sendWhatsapp, updateStatus } from '../../actions';
import { getCarrier, listCarriers } from '@/lib/carriers';

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string; ship?: string }> }) {
  const me = await requireSession(); const { t } = await getT();
  const { id } = await params; const { lang, ship } = await searchParams;
  const o = getOrder(me.workspaceId, Number(id)); if (!o) notFound();
  const ws = getWorkspace(me.workspaceId);
  const hist = customerHistory(me.workspaceId, o.phone, o.id);
  const refused = hist.filter((h) => ['cancelled', 'returned'].includes(h.status)).length;
  const key = (['darija', 'ar', 'fr'].includes(lang ?? '') ? lang : 'darija') as 'darija' | 'ar' | 'fr';
  const msg = buildMessage((ws as any)['template_' + key], key, o, ws.name);
  return (<>
    <div className="card">
      <p style={{ textAlign: 'end' }}><Link className="btn sec" href={`/orders/${o.id}/edit`}>✏️ {t.editLabel}</Link></p>
      <h1><bdi>{o.customer_name}</bdi> <span className={`badge ${o.status}`}>{(t as any)['s_' + o.status]}</span></h1>
      {refused > 0 && <div className="err">⚠ {t.refusedBefore} ×{refused}</div>}
      <p dir="ltr" style={{ textAlign: 'start' }}>{o.phone} · {o.city} · {o.address}</p>
      <p>{o.products} {o.size} {o.color} ×{o.quantity} — <strong>{o.price} MAD</strong></p>
      {o.notes && <p className="muted">{o.notes}</p>}
      {o.callback_at && <p className="muted">⏰ {o.callback_at}</p>}
    </div>
    <div className="card"><h2>{t.whatsapp}</h2>
      <div className="inline" style={{ marginBottom: 8 }}>
        {(['darija', 'ar', 'fr'] as const).map((k) => <a key={k} className={`btn ${k === key ? '' : 'sec'}`} href={`?lang=${k}`}>{t[k === 'ar' ? 'arabic' : k === 'fr' ? 'french' : 'darija']}</a>)}
      </div>
      <pre>{msg}</pre>
      <form action={sendWhatsapp}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="url" value={waLink(o.phone, msg)} />
        <button>💬 {t.openWa}</button></form>
    </div>
    {ship && <div className={ship === 'ok' ? 'ok' : 'err'}>{ship === 'ok' ? t.shipOk : (t as any)['ship_' + ship] ?? ship}</div>}
    <div className="card"><h2>🚚 {t.shipTitle}</h2>
      {o.parcel_code ? <p>{getCarrier(me.workspaceId, o.carrier_id ?? 0)?.name ?? ''} · {t.parcelLbl}: <strong dir="ltr">{o.parcel_code}</strong></p> : (() => {
        const apis = listCarriers(me.workspaceId).filter((c) => c.connector && c.has_creds);
        return apis.length === 0 ? <p className="muted"><Link href="/carriers">{t.carriers}</Link></p>
          : <div className="inline">{apis.map((c) => <form key={c.id} action={sendViaCarrier.bind(null, c.id)}><input type="hidden" name="id" value={o.id} /><button disabled={o.status !== 'confirmed'}>🚚 {t.sendTo} {c.name}</button></form>)}</div>;
      })()}
      {o.carrier_status && <p>{t.ameexStatusLbl}: <b>{o.carrier_status}</b></p>}
      {o.carrier_error && <p className="muted" dir="ltr">{o.carrier_error}</p>}
    </div>
    <div className="card"><h2>{t.updateStatus}</h2>
      <form action={updateStatus} className="inline"><input type="hidden" name="id" value={o.id} />
        <select name="status" defaultValue={o.status}>{STATUSES.map((s) => <option key={s} value={s}>{(t as any)['s_' + s]}</option>)}</select>
        <input type="datetime-local" name="callback_at" title={t.callbackAt} />
        <button>{t.save}</button></form></div>
    <div className="card"><h2>{t.history}</h2>
      {hist.length === 0 ? <p className="muted">{t.noHistory}</p> : hist.map((h) => (
        <div key={h.id} className="o"><a href={`/orders/${h.id}`}>{h.order_number}</a> <span className={`badge ${h.status}`}>{(t as any)['s_' + h.status]}</span> <span className="muted">{h.products} · {h.price} MAD · {h.created_at}</span></div>))}
    </div></>);
}
