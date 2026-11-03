import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { getWorkspace, queue, queueCounts } from '@/lib/orders';
import { DEFAULT_TEMPLATES, renderTemplate, waLink } from '@/lib/templates';
import { quickStatus } from '../actions';
import WaButton from './wa-button';

export default async function Confirm({ searchParams }: { searchParams: Promise<{ lane?: string; skip?: string; lang?: string }> }) {
  const me = await requireSession(); const { t } = await getT(); const sp = await searchParams;
  const lane = sp.lane === 'reply' ? 'reply' : 'send';
  const skip = (sp.skip ?? '').split(',').map(Number).filter(Boolean);
  const counts = queueCounts(me.workspaceId);
  const { next: o } = queue(me.workspaceId, lane, skip);
  const ws = getWorkspace(me.workspaceId);
  const key = (['darija', 'ar', 'fr'].includes(sp.lang ?? '') ? sp.lang : 'darija') as 'darija' | 'ar' | 'fr';
  const q = (extra: Record<string, string>) => '?' + new URLSearchParams({ lane, ...(sp.lang ? { lang: sp.lang } : {}), ...extra }).toString();
  return (<>
    <div className="inline" style={{ marginBottom: 12 }}>
      <Link className={`btn ${lane === 'send' ? '' : 'sec'}`} href="/confirm?lane=send">{t.laneSend} ({counts.send})</Link>
      <Link className={`btn ${lane === 'reply' ? '' : 'sec'}`} href="/confirm?lane=reply">{t.laneReply} ({counts.reply})</Link>
    </div>
    {!o ? (
      <div className="card" style={{ textAlign: 'center' }}><h1>{t.allDone}</h1>
        <p><Link className="btn" href="/orders/quick">+ {t.quickAdd}</Link></p></div>
    ) : (() => {
      const tpl = (ws as any)['template_' + key] || DEFAULT_TEMPLATES[key];
      const msg = renderTemplate(tpl, { name: o.customer_name, product: [o.products, o.size, o.color].filter(Boolean).join(' '), price: o.price, city: o.city || '' });
      return (<>
        <div className="card">
          <div className="top"><bdi className="nm" style={{ fontSize: 22 }}>{o.customer_name}</bdi><span className="price" dir="ltr" style={{ fontSize: 20 }}>{o.price} MAD</span></div>
          <div className="tags">
            {o.refusals > 0 && <span className="badge bad">⚠ {t.refusedBefore} ×{o.refusals}</span>}
            {lane === 'reply' && <span className={`badge ${o.status}`}>{(t as any)['s_' + o.status]}</span>}
          </div>
          <p><a href={`tel:${o.phone}`} dir="ltr">📞 {o.phone}</a> · {o.city}</p>
          {o.address && <p className="muted">{o.address}</p>}
          <p><bdi dir="auto">{o.quantity}× {o.products} {o.size} {o.color}</bdi></p>
          {o.callback_at && <p className="muted">⏰ {o.callback_at.replace('T', ' ')}</p>}
        </div>
        <div className="card">
          <div className="inline" style={{ marginBottom: 8 }}>
            {(['darija', 'ar', 'fr'] as const).map((k) => <Link key={k} className={`btn sec ${k === key ? 'on' : ''}`} href={q({ lang: k, ...(skip.length ? { skip: skip.join(',') } : {}) })}>{t[k === 'ar' ? 'arabic' : k === 'fr' ? 'french' : 'darija']}</Link>)}
          </div>
          <pre>{msg}</pre>
          <WaButton id={o.id} url={waLink(o.phone, msg)} label={lane === 'send' ? t.sendWa : t.openChat} markAsSent={o.status === 'new'} secondary={lane === 'reply'} />
        </div>
        {lane === 'reply' && (
          <div className="card">
            <div className="grid2">
              <form action={quickStatus.bind(null, o.id, 'confirmed', '')}><button className="big ok">{t.btnConfirm}</button></form>
              <form action={quickStatus.bind(null, o.id, 'cancelled', '')}><button className="big danger">{t.btnCancel}</button></form>
              <form action={quickStatus.bind(null, o.id, 'no_answer', '')}><button className="big sec">{t.btnNoAnswer}</button></form>
              <form action={quickStatus.bind(null, o.id, 'callback', '2')}><button className="big sec">{t.btnLater2h}</button></form>
            </div>
            <form action={quickStatus.bind(null, o.id, 'callback', 'tomorrow')} style={{ marginTop: 8 }}>
              <button className="sec" style={{ width: '100%' }}>{t.btnTomorrow}</button></form>
          </div>)}
        <p style={{ textAlign: 'center' }}><Link href={q({ skip: [...skip, o.id].join(',') })}>{t.skip} ›</Link> · <Link href={`/orders/${o.id}`}>#{o.order_number}</Link></p>
      </>);
    })()}
  </>);
}
