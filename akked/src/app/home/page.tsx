import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { db } from '@/lib/db';
import { getWorkspace, queueCounts, unmatchedCities } from '@/lib/orders';
import { listCarriers } from '@/lib/carriers';
import { bulkSendCarrier } from '../actions';
import { onboarding } from '@/lib/orders';
import { createDemoOrders } from '../actions';

export default async function Home() {
  const me = await requireSession(); const { t } = await getT();
  const ws = getWorkspace(me.workspaceId); const q = queueCounts(me.workspaceId);
  const carriers = listCarriers(me.workspaceId); const api = carriers.filter((c) => c.connector && c.has_creds);
  const n = (sql: string) => (db().prepare(sql).get(me.workspaceId) as any).c as number;
  const ready = n(`SELECT COUNT(*) c FROM orders WHERE workspace_id = ? AND status = 'confirmed' AND parcel_code IS NULL`);
  const today = n(`SELECT COUNT(*) c FROM orders WHERE workspace_id = ? AND date(created_at) = date('now') AND COALESCE(source,'') <> 'history'`);
  const todayOk = n(`SELECT COUNT(*) c FROM orders WHERE workspace_id = ? AND date(status_changed_at) = date('now') AND status IN ('confirmed','shipped','delivered')`);
  const todo = q.send + q.reply + q.call; const bad = unmatchedCities(me.workspaceId);
  const first = q.send ? 'send' : q.reply ? 'reply' : 'call';
  return (<>
    <h1>{t.homeHello} {me.fullName.split(' ')[0]} 👋 <span className="muted" style={{ fontSize: 14 }}>· {ws.name}</span></h1>
    <div className="chips" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
      <Link href="/orders"><b>{today}</b>{t.todayOrders}</Link><Link href="/orders?status=confirmed"><b>{todayOk}</b>{t.todayConfirmed}</Link></div>

    <div className="card step"><span className="n">1</span><div>
      <h2>{t.homeStep1}</h2><p>{t.homeStep1Sub}</p>
      <Link className="btn big" href="/orders/quick">{t.addOrdersBtn}</Link>
      <p style={{ margin: '8px 0 0', textAlign: 'center' }}><Link href="/orders/import">{t.orImportFile}</Link></p>
      {onboarding(me.workspaceId).total === 0 && <form action={createDemoOrders} style={{ marginTop: 8 }}><button className="sec" style={{ width: '100%' }}>{t.demoBtn}</button></form>}</div></div>

    <div className={`card step ${todo === 0 ? 'done' : ''}`}><span className="n">2</span><div>
      <h2>{t.homeStep2}</h2><p>{t.homeStep2Sub}</p>
      <div className="chips">
        <Link href="/confirm?lane=send" className={q.send ? 'hot' : ''}><b>{q.send}</b>{t.laneSend}</Link>
        <Link href="/confirm?lane=reply" className={q.reply ? 'hot' : ''}><b>{q.reply}</b>{t.laneReply}</Link>
        <Link href="/confirm?lane=call" className={q.call ? 'hot' : ''}><b>{q.call}</b>{t.laneCall}</Link></div>
      <Link className={`btn big ${todo ? '' : 'sec'}`} href={`/confirm?lane=${first}`}>{t.startConfirmBtn}</Link></div></div>

    <div className={`card step ${ready === 0 ? 'done' : ''}`}><span className="n">3</span><div>
      <h2>{t.homeStep3}</h2><p>{t.homeStep3Sub}</p>
      {ready === 0 ? <p>{t.noneConfirmedYet}</p> : <>
        <p><b>{ready}</b> {t.readyToShip}</p>
        {carriers.length === 0 && <Link className="btn big" href="/carriers/new#upload">{t.addCarrierBtn}</Link>}
        {api.map((c) => <form key={c.id} action={bulkSendCarrier.bind(null, c.id)} style={{ marginBottom: 8 }}><button className="big">🚚 {t.sendTo} {c.name}</button></form>)}
        {me.role === 'owner' && carriers.map((c) => <a key={c.id} className="btn sec big" href={`/export?carrier=${c.id}`} style={{ marginBottom: 8 }}>⬇ {t.exportFor} {c.name}</a>)}
      </>}</div></div>

    {bad.length > 0 && <div className="err">⚠ {t.cityWarn.split('(')[0]}: {bad.slice(0, 5).map((b) => <Link key={b.id} href={`/orders/${b.id}/edit`}>{b.order_number} </Link>)}</div>}
  </>);
}
