import './globals.css';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { logout, setLang } from './actions';

export const metadata: Metadata = { title: 'Akked — أكّد', description: 'Order confirmation for Moroccan COD sellers', manifest: '/manifest.webmanifest' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f9d58' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { l, t, dir } = await getT();
  const me = await getSession();
  return (
    <html lang={l} dir={dir}>
      <body>
        <nav>
          <strong style={{ padding: '0 8px' }}>{t.appName}</strong>
          {me && <>
            <Link href="/confirm">{t.confirmNav}</Link>
            <Link href="/inbox">{t.inboxNav}</Link>
            <Link href="/orders">{t.orders}</Link>
            {(me.role === 'owner' || me.isAdmin) && <>
              <Link href="/dashboard">{t.dashboard}</Link>
              <Link href="/team">{t.team}</Link>
              <Link href="/settings">{t.settings}</Link>
            </>}
            {me.isAdmin && <Link href="/admin">{t.admin}</Link>}
          </>}
          <span className="sp" />
          <form action={setLang.bind(null, l === 'ar' ? 'fr' : 'ar')}><button className="sec" style={{ padding: '6px 10px' }}>{l === 'ar' ? 'FR' : 'عربي'}</button></form>
          {me && <form action={logout}><button className="sec" style={{ padding: '6px 10px' }}>{t.logout}</button></form>}
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
