import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { getWorkspace, queue, queueCounts, type Lane } from '@/lib/orders';
import { buildMessage, waLink } from '@/lib/templates';
import { quickCancel, quickStatus, sendConfirmTemplate } from '../actions';
import { CANCEL_REASONS } from '@/lib/reasons';
import { waCreds } from '@/lib/inbox';
import WaButton from './wa-button';
import ReplyHelper from './reply-helper';

export default async function Confirm({ searchParams }: { searchParams: Promise<{ lane?: string; skip?: string; lang?: string; err?: string; cancel?: string }> }) {
  const me = await requireSession(); const { t } = await getT(); const sp = await searchParams;
  const lane: Lane = sp.lane === 'reply' ? 'reply' : sp.lane === 'call' ? 'call' : 'send';
  const skip = (sp.skip ?? '').split(',').map(Number).filter(Boolean);
  const counts = queueCounts(me.workspaceId);
  const { next: o } = queue(me.workspaceId, lane, skip, me.userId);
  const ws = getWorkspace(me.workspaceId);
  const official = !!waCreds(me.workspaceId);
  const key = (['darija', 'ar', 'fr'].includes(sp.lang ?? '') ? sp.lang : 'darija') as 'darija' | 'ar' | 'fr';
  const q = (extra: Record<string, string>) => '?' + new URLSearchParams({ lane, ...(sp.lang ? { lang: sp.lang } : {}), ...extra }).toString();
  const tabs: [Lane, string, number][] = [['send', t.laneSend, counts.send], ['reply', t.laneReply, counts.reply], ['call', t.laneCall, counts.call]];
  return (<>
    <div className="tabs">
      {tabs.map(([k, label, n]) => <Link key={k} className={`btn ${lane === k ? '' : 'sec'}`} href={`/confirm?lane=${k}`}>{label} ({n})</Link>)}
    </div>
    {sp.err && <div className="err" dir="auto">{(t as any)[sp.err] ?? sp.err}</div>}
    {!o ? (<>
        <div className="card" style={{ textAlign: 'center' }}><h1>{t.allDone}</h1>
        <p><Link className="btn" href="/orders/quick">+ {t.quickAdd}</Link></p></div>
    </>) : (() => {
      const msg = buildMessage((ws as any)['template_' + key], key, o, ws.name);
      const results = lane !== 'send';
      return (<>
        <div className="card">
          <div className="top"><bdi className="nm" style={{ fontSize: 22 }}>{o.customer_name}</bdi><span className="price" dir="ltr" style={{ fontSize: 20 }}>{o.price} MAD</span></div>
          <div className="tags">
            {o.refusals > 0 && <span className="badge bad">⚠ {t.refusedBefore} ×{o.refusals}</span>}
            {results && <span className={`badge ${o.status}`}>{(t as any)['s_' + o.status]}</span>}
          </div>
          <p><a href={`tel:${o.phone}`} dir="ltr">📞 {o.phone}</a> · {o.city}</p>
          {o.address ? <p className="muted">{o.address}</p> : <p><span className="badge bad">⚠ {t.addressMissing}</span></p>}
          <p><Link href={`/orders/${o.id}/edit?back=${encodeURIComponent('/confirm?lane=' + lane)}`}>✏️ {t.editLabel}</Link></p>
          <p><bdi dir="auto">{o.quantity}× {o.products} {o.size} {o.color}</bdi></p>
          {o.callback_at && <p className="muted">⏰ {o.callback_at.replace('T', ' ')}</p>}
        </div>
        {lane === 'call' && <a className="btn big" href={`tel:${o.phone}`} style={{ marginBottom: 12 }}>📞 {t.callNow}</a>}
        <div className="card">
          <div className="inline" style={{ marginBottom: 8 }}>
            {(['darija', 'ar', 'fr'] as const).map((k) => <Link key={k} className={`btn sec ${k === key ? 'on' : ''}`} href={q({ lang: k, ...(skip.length ? { skip: skip.join(',') } : {}) })}>{t[k === 'ar' ? 'arabic' : k === 'fr' ? 'french' : 'darija']}</Link>)}
          </div>
          <pre>{msg}</pre>
          {official && lane === 'send' && <form action={sendConfirmTemplate.bind(null, o.id)} style={{ marginBottom: 8 }}><button className="big">⚡ {t.sendOfficial}</button></form>}
          {official && results && <Link className="btn big" href={`/inbox/${o.phone.replace('+', '')}`} style={{ marginBottom: 8 }}>💬 {t.openInbox}</Link>}
          <WaButton id={o.id} url={waLink(o.phone, msg)} label={lane === 'send' ? t.sendWa : t.openChat} markAsSent={o.status === 'new'} secondary={results || official} />
        </div>
        {results && sp.cancel === '1' ? (
          <div className="card"><h2>{t.cancelReason}</h2>
            <div className="grid2">
              {CANCEL_REASONS.filter((r) => r !== 'unspecified').map((r) => <form key={r} action={quickCancel.bind(null, o.id, r, lane)}><button className="big danger">{(t as any)['r_' + r]}</button></form>)}
              <form action={quickCancel.bind(null, o.id, 'unspecified', lane)}><button className="big sec">{t.btnCancel}</button></form>
            </div>
            <p style={{ textAlign: 'center' }}><Link href={q({})}>‹ {t.backBtn}</Link></p>
          </div>
        ) : results && (<>
          <ReplyHelper confirmAction={quickStatus.bind(null, o.id, 'confirmed', '', lane)} cancelAction={quickCancel.bind(null, o.id, 'unspecified', lane)}
            labels={{ pasteReply: t.pasteReply, suggestConfirm: t.suggestConfirm, suggestCancel: t.suggestCancel, shortcuts: t.shortcuts }} />
          <div className="card">
            <div className="grid2">
              <form action={quickStatus.bind(null, o.id, 'confirmed', '', lane)}><button className="big ok" data-act="confirmed">{t.btnConfirm}</button></form>
              <Link className="btn big danger" href={q({ cancel: '1', ...(skip.length ? { skip: skip.join(',') } : {}) })} data-act="cancelled">{t.btnCancel}</Link>
              <form action={quickStatus.bind(null, o.id, 'no_answer', '', lane)}><button className="big sec" data-act="no_answer">{t.btnNoAnswer}</button></form>
              <form action={quickStatus.bind(null, o.id, 'callback', '2', lane)}><button className="big sec">{t.btnLater2h}</button></form>
            </div>
            <form action={quickStatus.bind(null, o.id, 'callback', 'tomorrow', lane)} style={{ marginTop: 8 }}>
              <button className="sec" style={{ width: '100%' }}>{t.btnTomorrow}</button></form>
          </div>
        </>)}
        <p style={{ textAlign: 'center' }}><Link href={q({ skip: [...skip, o.id].join(',') })}>{t.skip} ›</Link> · <Link href={`/orders/${o.id}`}>#{o.order_number}</Link></p>
      </>);
    })()}
  </>);
}
