import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { conversations, waCreds } from '@/lib/inbox';
import AutoRefresh from './auto-refresh';

export default async function Inbox() {
  const me = await requireSession(); const { t } = await getT();
  const list = conversations(me.workspaceId); const connected = !!waCreds(me.workspaceId);
  return (<><AutoRefresh /><h1>{t.inboxNav}</h1>
    {!connected && <div className="err">{t.waConnect} <Link href="/settings">{t.settings}</Link></div>}
    <div className="card">
      {list.length === 0 && <p className="muted">{t.noChats}</p>}
      {list.map((c) => (
        <Link key={c.phone} href={`/inbox/${c.phone.replace('+', '')}`} className="o">
          <div className="top"><bdi className="nm">{c.name || c.phone}</bdi>
            {c.direction === 'in' && <span className="badge bad">{t.needsReply}</span>}</div>
          <div className="muted"><bdi dir="auto">{c.direction === 'out' ? '✓ ' : ''}{String(c.body).slice(0, 80)}</bdi></div>
        </Link>))}
    </div></>);
}
