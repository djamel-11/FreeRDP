import Link from 'next/link';
import { onboarding } from '@/lib/orders';
import { createDemoOrders } from './actions';

export default function Onboarding({ wsId, t }: { wsId: number; t: Record<string, string> }) {
  const o = onboarding(wsId);
  if (!o.show) return null;
  const items = [[t.ob1, '/orders/quick'], [t.ob2, '/confirm'], [t.ob3, '/confirm?lane=reply']] as const;
  return (
    <div className="card" style={{ borderColor: 'var(--brand)' }}>
      <h2>{t.obTitle}</h2>
      {items.map(([label, href], i) => (
        <p key={i} style={{ margin: '8px 0' }}>{o.steps[i] ? '✅' : `${i + 1}️⃣`} <Link href={href}>{label}</Link></p>))}
      {o.total === 0 && <form action={createDemoOrders}><button className="sec">{t.demoBtn}</button></form>}
    </div>
  );
}
