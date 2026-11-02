import { requireSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { getWorkspace, teamMembers, PLANS, type PlanKey } from '@/lib/orders';
import { addAgent } from '../actions';
export default async function Team({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requireSession(); const { t } = await getT(); const sp = await searchParams;
  const ws = getWorkspace(me.workspaceId); const m = teamMembers(me.workspaceId); const lim = PLANS[ws.plan as PlanKey].users;
  return (<><h1>{t.team} ({m.length}/{lim === Infinity ? '∞' : lim})</h1>
    <div className="card">{m.map((u) => <div key={u.id} className="o">{u.full_name} <span className="muted">{u.email} · {u.role}</span></div>)}</div>
    {me.role === 'owner' && <div className="card"><h2>{t.addAgent}</h2>
      {sp.error && <div className="err">{sp.error === 'limit' ? t.agentLimit : '✖'}</div>}
      <form action={addAgent}><label>{t.fullName}</label><input name="name" required /><label>{t.email}</label><input name="email" type="email" required />
        <label>{t.tempPassword}</label><input name="password" minLength={8} required /><p><button>{t.save}</button></p></form></div>}</>);
}
