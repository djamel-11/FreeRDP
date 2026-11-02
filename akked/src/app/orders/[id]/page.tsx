import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { getT, STATUSES } from '@/lib/i18n';
import { customerHistory, getOrder, getWorkspace } from '@/lib/orders';
import { DEFAULT_TEMPLATES, renderTemplate, waLink } from '@/lib/templates';
import { sendWhatsapp, updateStatus } from '../../actions';

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const me = await requireSession(); const { t } = await getT();
  const { id } = await params; const { lang } = await searchParams;
  const o = getOrder(me.workspaceId, Number(id)); if (!o) notFound();
  const ws = getWorkspace(me.workspaceId);
  const hist = customerHistory(me.workspaceId, o.phone, o.id);
  const refused = hist.filter((h) => ['cancelled', 'returned'].includes(h.status)).length;
  const key = (['darija', 'ar', 'fr'].includes(lang ?? '') ? lang : 'darija') as 'darija' | 'ar' | 'fr';
  const tpl = (ws as any)['template_' + key] || DEFAULT_TEMPLATES[key];
  const msg = renderTemplate(tpl, { name: o.customer_name, product: [o.products, o.size, o.color].filter(Boolean).join(' '), price: o.price, city: o.city || '' });
  return (<>
    <div className="card">
      <h1>{o.customer_name} <span className={`badge ${o.status}`}>{(t as any)['s_' + o.status]}</span></h1>
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
