import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import ClearFlash from '../clear-flash';

export default async function Welcome() {
  await requireSession(); const { t } = await getT();
  const code = (await cookies()).get('akked_flash')?.value;
  if (!code) redirect('/orders');
  return (<div className="card" style={{ maxWidth: 520, margin: '24px auto', textAlign: 'center' }}>
    <ClearFlash />
    <h1>{t.welcomeTitle}</h1>
    <h2>{t.recoveryTitle}</h2>
    <pre dir="ltr" style={{ fontSize: 28, letterSpacing: 2, textAlign: 'center', userSelect: 'all' }}>{code}</pre>
    <p className="muted">{t.recoveryHint}</p>
    <p><Link className="btn big" href="/orders">{t.continueBtn}</Link></p>
  </div>);
}
