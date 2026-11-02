import Link from 'next/link';
import { getT } from '@/lib/i18n';
import { signup } from '../actions';
export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { t } = await getT(); const sp = await searchParams;
  return (<div className="card" style={{ maxWidth: 420, margin: '24px auto' }}>
    <h1>{t.signup}</h1><p className="muted">{t.tagline} — 14 {t.days}</p>
    {sp.error && <div className="err">{sp.error === 'exists' ? 'Email déjà utilisé / البريد مستعمل' : 'Min 8 caractères / 8 أحرف على الأقل'}</div>}
    <form action={signup}><label>{t.storeName}</label><input name="store" required />
      <label>{t.fullName}</label><input name="name" required />
      <label>{t.email}</label><input name="email" type="email" required />
      <label>{t.password}</label><input name="password" type="password" minLength={8} required autoComplete="new-password" />
      <p><button>{t.signup}</button> <Link href="/login">{t.login}</Link></p></form></div>);
}
