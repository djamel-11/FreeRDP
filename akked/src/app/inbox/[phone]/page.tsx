import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { openOrderFor, thread, waCreds, windowOpen } from '@/lib/inbox';
import { inboxStatus, sendConfirmTemplate, sendWaText } from '../../actions';
import AutoRefresh from '../auto-refresh';

export default async function Chat({ params, searchParams }: { params: Promise<{ phone: string }>; searchParams: Promise<{ err?: string }> }) {
  const me = await requireSession(); const { t } = await getT();
  const { phone: digits } = await params; const { err } = await searchParams;
  const phone = '+' + digits.replace(/\D/g, '');
  const msgs = thread(me.workspaceId, phone); const o = openOrderFor(me.workspaceId, phone);
  const open = windowOpen(me.workspaceId, phone); const connected = !!waCreds(me.workspaceId);
  const errText = err ? ((t as any)[err] ?? (err === 'window' ? t.windowClosed : err)) : '';
  return (<><AutoRefresh seconds={5} />
    <p><Link href="/inbox">‹ {t.inboxNav}</Link></p>
    {errText && <div className="err" dir="auto">{errText}</div>}
    {o && (<div className="card">
      <div className="top"><bdi className="nm">{o.customer_name}</bdi><span className="price" dir="ltr">{o.price} MAD</span></div>
      <div className="tags"><span className={`badge ${o.status}`}>{(t as any)['s_' + o.status]}</span></div>
      <p className="muted"><bdi dir="ltr">{phone}</bdi> · {o.city} · <bdi dir="auto">{o.quantity}× {o.products}</bdi></p>
      <div className="grid2">
        <form action={inboxStatus.bind(null, o.id, 'confirmed', digits)}><button className="big ok">{t.btnConfirm}</button></form>
        <form action={inboxStatus.bind(null, o.id, 'cancelled', digits)}><button className="big danger">{t.btnCancel}</button></form>
      </div>
      <p><Link href={`/orders/${o.id}`}>#{o.order_number}</Link></p>
    </div>)}
    <div className="card chat">
      {msgs.length === 0 && <p className="muted">{t.noChats}</p>}
      {msgs.map((m) => (
        <div key={m.id} className={`bub ${m.direction}`}><bdi dir="auto">{m.body}</bdi>
          <span className="meta">{m.created_at.slice(11, 16)}{m.direction === 'out' && m.status ? ` · ${m.status}` : ''}</span></div>))}
    </div>
    {connected && (<div className="card">
      {open ? (
        <form action={sendWaText.bind(null, digits)} className="inline"><input name="text" placeholder={t.typeMsg} autoComplete="off" required /><button style={{ flex: '0 0 auto' }}>{t.sendBtn}</button></form>
      ) : (<>
        <p className="muted">{t.windowClosed}</p>
        {o && o.status === 'new' && <form action={sendConfirmTemplate.bind(null, o.id)}><button className="big">{t.sendTemplateBtn}</button></form>}
      </>)}
    </div>)}
  </>);
}
