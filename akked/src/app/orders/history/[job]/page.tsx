import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { db } from '@/lib/db';
import { readTable } from '@/lib/tableReader';
import { defaultFields, distinctStatuses, FIELDS, HIST_STATUSES, planImport, suggestStatus, type Field, type HistStatus } from '@/lib/history';
import { confirmHistoryImport } from '../../../actions';

export default async function HistoryReview({ params, searchParams }: { params: Promise<{ job: string }>; searchParams: Promise<Record<string, string>> }) {
  const me = await requireOwner(); const { t } = await getT();
  const { job: jobId } = await params; const sp = await searchParams;
  const job = db().prepare('SELECT bytes, filename FROM import_jobs WHERE id = ? AND workspace_id = ?').get(Number(jobId), me.workspaceId) as any;
  if (!job) notFound();
  const table = await readTable(new Uint8Array(job.bytes), job.filename ?? ''); if (!table) notFound();
  // column mapping: suggestions, overridden by what the user picked (query string) so the page works without JavaScript
  const fields = defaultFields(table);
  for (const h of table.headers) { const v = sp['f_' + h.col]; if (v && (FIELDS as readonly string[]).includes(v)) fields[h.col] = v as Field; }
  const raws = distinctStatuses(table, fields);
  const statusMap: Record<string, HistStatus> = {}; raws.forEach((r, i) => { const v = sp['st_' + i]; statusMap[r] = (HIST_STATUSES as readonly string[]).includes(v) ? (v as HistStatus) : suggestStatus(r); });
  const dflt = ((HIST_STATUSES as readonly string[]).includes(sp.default) ? sp.default : 'shipped') as HistStatus;
  const plan = planImport(table, { fields, statusMap, defaultStatus: dflt });
  const hasPhone = Object.values(fields).includes('phone'), hasName = Object.values(fields).includes('customer_name');
  const opt = (v: string) => <option key={v} value={v}>{(t as any)['f_' + v]}</option>;
  return (<>
    <p><Link href="/orders/history">‹ {t.histTitle}</Link></p>
    <h1>{job.filename}</h1>
    <div className="card"><p>{table.rows.length} {t.histRows} · <b>{plan.rows.length}</b> {t.histValid} · {plan.invalid} {t.histInvalid}</p>
      {(!hasPhone || !hasName) && <div className="err">⚠ {t.f_customer_name} + {t.f_phone}</div>}</div>

    <div className="card"><h2>{t.histColumns}</h2><p className="muted">{t.histColumnsHint}</p>
      <form method="get">
        {table.headers.map((h) => (<div key={h.col} className="maprow"><div className="maphead" dir="auto"><b>{h.header}</b></div>
          <select name={'f_' + h.col} defaultValue={fields[h.col]}>{FIELDS.map(opt)}</select></div>))}
        {raws.map((r, i) => <input key={i} type="hidden" name={'st_' + i} value={statusMap[r]} />)}
        <p><button className="sec">{t.histUpdate}</button></p></form></div>

    <div className="card"><h2>{t.histPreviewTitle}</h2>
      <div style={{ overflowX: 'auto' }}><table><tbody>
        {plan.rows.slice(0, 5).map((r, i) => <tr key={i}><td><bdi>{r.customer_name}</bdi></td><td dir="ltr">{r.phone}</td><td>{r.city}</td><td>{r.price}</td><td><span className={`badge ${r.status}`}>{(t as any)['h_' + r.status]}</span></td><td dir="ltr">{r.created_at?.slice(0, 10) ?? ''}</td></tr>)}
      </tbody></table></div></div>

    <form action={confirmHistoryImport.bind(null, Number(jobId))}>
      {table.headers.map((h) => <input key={h.col} type="hidden" name={'f_' + h.col} value={fields[h.col]} />)}
      {raws.length > 0 && <div className="card"><h2>{t.histStatuses}</h2><p className="muted">{t.histStatusesHint}</p>
        {raws.map((r, i) => (<div key={i} className="maprow"><input type="hidden" name={'stv_' + i} value={r} /><div className="maphead" dir="auto"><b>{r}</b></div>
          <select name={'st_' + i} defaultValue={statusMap[r]}>{HIST_STATUSES.map((s) => <option key={s} value={s}>{(t as any)['h_' + s]}</option>)}</select></div>))}</div>}
      <div className="card"><label>{t.histDefault}</label><select name="default" defaultValue={dflt}>{HIST_STATUSES.map((s) => <option key={s} value={s}>{(t as any)['h_' + s]}</option>)}</select></div>
      <button className="big" disabled={!hasPhone || !hasName || plan.rows.length === 0}>{t.histImportBtn} ({plan.rows.length})</button>
    </form>
  </>);
}
