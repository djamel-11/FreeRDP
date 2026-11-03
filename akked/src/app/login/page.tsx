import Link from 'next/link';
import { getT } from '@/lib/i18n';
import { login } from '../actions';
import ApkBridge from '../apk-bridge';
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { t } = await getT(); const sp = await searchParams;
  return (<div className="card" style={{ maxWidth: 420, margin: '24px auto' }}>
    <h1>{t.login}</h1><p className="muted">{t.tagline}</p>
    {sp.error && <div className="err">{sp.error === 'locked' ? t.lockedMsg : t.badCode}</div>}
    <form action={login}><label>{t.email}</label><input name="email" type="email" required autoComplete="email" />
      <label>{t.password}</label><input name="password" type="password" required autoComplete="current-password" />
      <p><button>{t.login}</button> <Link href="/signup">{t.signup}</Link> · <Link href="/reset">{t.forgot}</Link></p></form><ApkBridge label={t.changeServer} /></div>);
}
