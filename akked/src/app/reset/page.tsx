import Link from 'next/link';
import { getT } from '@/lib/i18n';
import { resetPassword } from '../actions';

export default async function Reset({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { t } = await getT(); const sp = await searchParams;
  const msg = sp.error === 'locked' ? t.lockedMsg : sp.error === 'short' ? t.shortPw : sp.error ? t.badCode : '';
  return (<div className="card" style={{ maxWidth: 420, margin: '24px auto' }}>
    <h1>{t.resetTitle}</h1>
    {msg && <div className="err">{msg}</div>}
    <form action={resetPassword}>
      <label>{t.email}</label><input name="email" type="email" required autoComplete="email" />
      <label>{t.recoveryCode}</label><input name="code" dir="ltr" placeholder="XXXX-XXXX-XXXX" required autoComplete="off" />
      <label>{t.newPassword}</label><input name="password" type="password" minLength={8} required autoComplete="new-password" />
      <p><button>{t.resetBtn}</button> <Link href="/login">{t.login}</Link></p></form></div>);
}
