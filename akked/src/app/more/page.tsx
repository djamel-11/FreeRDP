import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { waCreds } from '@/lib/inbox';
import { pendingCount } from '@/lib/billing';
import { logout, setLang } from '../actions';

type Item = { href: string; icon: string; title: string; desc: string };
export default async function More() {
  const me = await requireSession(); const { l, t } = await getT();
  const owner = me.role === 'owner' || me.isAdmin;
  const daily: Item[] = [];
  if (waCreds(me.workspaceId)) daily.push({ href: '/inbox', icon: '💬', title: t.inboxNav, desc: t.inboxDesc });
  const setup: Item[] = owner ? [
    { href: '/dashboard', icon: '📊', title: t.dashboard, desc: t.dashDesc },
    { href: '/carriers', icon: '🚚', title: t.carriers, desc: t.carriersDesc },
    { href: '/orders/history', icon: '📥', title: t.histShort, desc: t.histDesc },
    { href: '/team', icon: '👥', title: t.team, desc: t.teamDesc },
    { href: '/settings', icon: '⚙️', title: t.settings, desc: t.settingsDesc },
  ] : [];
  const account: Item[] = owner ? [
    { href: '/billing', icon: '💳', title: t.billing, desc: t.billingDesc },
    { href: '/settings/data', icon: '🔒', title: t.myData, desc: t.dataDesc },
  ] : [];
  if (me.isAdmin) { const p = pendingCount(); account.push({ href: '/admin', icon: '🛠', title: t.admin + (p ? ` (${p})` : ''), desc: t.adminDesc }); }
  const section = (title: string, items: Item[]) => items.length > 0 && (<><div className="sec-title">{title}</div>
    <div className="tiles">{items.map((i) => <Link key={i.href} href={i.href} className="tile"><span className="ic">{i.icon}</span><span><b>{i.title}</b><small>{i.desc}</small></span></Link>)}</div></>);
  return (<><h1>{t.moreTitle}</h1>
    {section(t.secDaily, daily)}{section(t.secSetup, setup)}{section(t.secAccount, account)}
    <div className="sec-title">{me.fullName} · {me.email}</div>
    <div className="inline">
      <form action={setLang.bind(null, l === 'ar' ? 'fr' : 'ar')}><button className="sec">{l === 'ar' ? 'Français' : 'العربية'}</button></form>
      <form action={logout}><button className="sec">{t.logout}</button></form></div>
  </>);
}
