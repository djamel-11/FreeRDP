import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { startHistoryImport } from '../../actions';

export default async function History({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireOwner(); const { t } = await getT(); const sp = await searchParams;
  return (<><p><Link href="/orders">‹ {t.orders}</Link></p><h1>📥 {t.histTitle}</h1>
    {sp.error && <div className="err">{(t as any)['histErr_' + sp.error] ?? '✖'}</div>}
    <div className="card"><p className="muted">{t.histHint}</p>
      <form action={startHistoryImport}><input type="file" name="file" accept=".xlsx,.csv,.txt" required />
        <p><button>{t.histUpload}</button></p></form></div></>);
}
