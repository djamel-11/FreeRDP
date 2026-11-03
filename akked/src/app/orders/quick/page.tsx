import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import QuickAdd from './quick-add';

export default async function Quick({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireSession(); const { t } = await getT(); const sp = await searchParams;
  const msg = sp.error === 'limit' ? t.limitReached : sp.error === 'expired' ? t.expired : sp.error ? '✖' : '';
  return (<div className="card"><h1>{t.quickAdd}</h1>
    {msg && <div className="err">{msg}</div>}
    <p className="muted">{t.pasteOrder}</p>
    <QuickAdd t={t as any} />
    <p><Link href="/orders/new">{t.fullForm}</Link> · <Link href="/orders/import">{t.import}</Link></p></div>);
}
