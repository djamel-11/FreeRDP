import { requireSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { importOrders } from '../../actions';
export default async function Import({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireSession(); const { t } = await getT(); const sp = await searchParams;
  return (<div className="card"><h1>{t.import}</h1>
    {sp.ok && <div className="ok">{t.imported}: {sp.ok} · {t.skipped}: {sp.skipped}</div>}
    {sp.error && <div className="err">{sp.error === 'limit' ? t.limitReached : sp.error === 'expired' ? t.expired : '✖'}</div>}
    <p className="muted">{t.pasteHint}</p>
    <form action={importOrders}>
      <textarea name="text" rows={8} dir="ltr" placeholder={'name,phone,city,product,size,price\nSara,0612345678,Casablanca,Robe,M,199'} />
      <label>CSV / TSV (.csv, .tsv, .txt)</label><input type="file" name="file" accept=".csv,.tsv,.txt,text/csv" />
      <p><button>{t.importBtn}</button></p></form>
    <p className="muted">Excel: ألصق الخلايا مباشرة أو احفظ الملف كـ CSV · Collez les cellules ou enregistrez en CSV.</p></div>);
}
