import './globals.css';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { logout, setLang } from './actions';
import { getWorkspace } from '@/lib/orders';
import { daysLeft, pendingCount } from '@/lib/billing';
import { isActive } from '@/lib/plans';

export const metadata: Metadata = { title: 'Akked — أكّد', description: 'Order confirmation for Moroccan COD sellers', manifest: '/manifest.webmanifest' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f9d58' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { l, t, dir } = await getT();
  const me = await getSession();
  const ws = me ? getWorkspace(me.workspaceId) : null;
  const left = ws ? daysLeft(ws.period_end) : 99;
  const pending = me?.isAdmin ? pendingCount() : 0;
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
              <Link href="/billing">{t.billing}</Link>
              <Link href="/settings">{t.settings}</Link>
            </>}
            {me.isAdmin && <Link href="/admin">{t.admin}{pending > 0 ? ` (${pending})` : ''}</Link>}
          </>}
          <span className="sp" />
          <form action={setLang.bind(null, l === 'ar' ? 'fr' : 'ar')}><button className="sec" style={{ padding: '6px 10px' }}>{l === 'ar' ? 'FR' : 'عربي'}</button></form>
          {me && <form action={logout}><button className="sec" style={{ padding: '6px 10px' }}>{t.logout}</button></form>}
        </nav>
        <main>
          {me && ws && me.role === 'owner' && (!isActive(ws) || left <= 3) && (
            <div className={isActive(ws) ? 'warnbar' : 'err'}>{isActive(ws) ? `${t.trialEnding} ${left} ${t.days}` : t.trialEnded} <Link href="/billing"><b>{t.subscribeNow}</b></Link></div>)}
          {children}
          <footer className="foot"><Link href="/terms">{t.terms}</Link> · <Link href="/privacy">{t.privacy}</Link></footer>
        </main>
      </body>
    </html>
  );
}
