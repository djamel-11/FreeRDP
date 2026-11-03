import './globals.css';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { setLang } from './actions';
import TabBar, { type Tab } from './tabbar';
import { getWorkspace, queueCounts } from '@/lib/orders';
import { daysLeft } from '@/lib/billing';
import { isActive } from '@/lib/plans';

export const metadata: Metadata = { title: 'Akked — أكّد', description: 'Order confirmation for Moroccan COD sellers', manifest: '/manifest.webmanifest' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f9d58' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { l, t, dir } = await getT();
  const me = await getSession();
  const ws = me ? getWorkspace(me.workspaceId) : null;
  const left = ws ? daysLeft(ws.period_end) : 99;
  const counts = me ? queueCounts(me.workspaceId) : null;
  const todo = counts ? counts.send + counts.reply + counts.call : 0;
  const tabs: Tab[] = [
    { href: '/home', label: t.navHome, icon: '🏠', match: ['/home'] },
    { href: '/orders/quick', label: t.navAdd, icon: '➕', match: ['/orders/quick', '/orders/new', '/orders/import', '/orders/history'], primary: true },
    { href: '/confirm', label: t.navConfirm, icon: '✅', match: ['/confirm', '/inbox'], badge: todo },
    { href: '/orders', label: t.navOrders, icon: '📋', match: ['/orders'] },
    { href: '/more', label: t.navMore, icon: '☰', match: ['/more', '/dashboard', '/team', '/carriers', '/billing', '/settings', '/admin'] },
  ];
  return (
    <html lang={l} dir={dir}>
      <body className={me ? 'has-tabs' : ''}>
        <header className="topbar">
          <Link href={me ? '/home' : '/login'} className="brand">{t.appName}</Link>
          <span className="sp" />
          <form action={setLang.bind(null, l === 'ar' ? 'fr' : 'ar')}><button className="sec" style={{ padding: '6px 10px' }}>{l === 'ar' ? 'FR' : 'عربي'}</button></form>
        </header>
        <main>
          {me && ws && me.role === 'owner' && (!isActive(ws) || left <= 3) && (
            <div className={isActive(ws) ? 'warnbar' : 'err'}>{isActive(ws) ? `${t.trialEnding} ${left} ${t.days}` : t.trialEnded} <Link href="/billing"><b>{t.subscribeNow}</b></Link></div>)}
          {children}
          <footer className="foot"><Link href="/terms">{t.terms}</Link> · <Link href="/privacy">{t.privacy}</Link></footer>
        </main>
        {me && <TabBar tabs={tabs} />}
      </body>
    </html>
  );
}
