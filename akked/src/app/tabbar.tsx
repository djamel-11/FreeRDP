'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface Tab { href: string; label: string; icon: string; match: string[]; badge?: number; primary?: boolean }
/** Bottom navigation: five big, always-visible places. */
export default function TabBar({ tabs }: { tabs: Tab[] }) {
  const path = usePathname() ?? '';
  return (
    <nav className="tabbar" aria-label="main">
      {tabs.map((t) => {
        const on = t.match.some((m) => (m === '/' ? path === '/' : path === m || path.startsWith(m + '/')));
        return (
          <Link key={t.href} href={t.href} className={`${on ? 'on' : ''} ${t.primary ? 'add' : ''}`} aria-current={on ? 'page' : undefined}>
            <span className="ic">{t.icon}{t.badge ? <b className="dot">{t.badge > 99 ? '99+' : t.badge}</b> : null}</span>
            <span>{t.label}</span>
          </Link>);
      })}
    </nav>
  );
}
