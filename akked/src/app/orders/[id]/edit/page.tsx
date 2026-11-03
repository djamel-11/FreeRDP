import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { getOrder } from '@/lib/orders';
import { AMEEX_CITIES } from '@/lib/ameex-cities';
import { canonicalCity } from '@/lib/cities';
import { updateOrderAction } from '../../../actions';

export default async function EditOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; back?: string }> }) {
  const me = await requireSession(); const { t } = await getT();
  const { id } = await params; const sp = await searchParams;
  const o = getOrder(me.workspaceId, Number(id)); if (!o) notFound();
  const names = [...new Set(AMEEX_CITIES.map((c) => c.name))].sort();
  const back = sp.back && sp.back.startsWith('/') ? sp.back : `/orders/${o.id}`;
  const msg = sp.error === 'phone' ? t.invalidPhone : sp.error === 'name' ? t.nameRequired : sp.error ? '✖' : '';
  const known = !!canonicalCity(o.city);
  return (<div className="card"><h1>{t.editOrder} <span className="muted">{o.order_number}</span></h1>
    {msg && <div className="err">{msg}</div>}
    <form action={updateOrderAction.bind(null, o.id)}>
      <input type="hidden" name="back" value={back} />
      <div className="row"><div><label>{t.name}</label><input name="customer_name" defaultValue={o.customer_name} required /></div>
        <div><label>{t.phone}</label><input name="phone" type="tel" dir="ltr" defaultValue={o.phone} required /></div>
        <div><label>{t.city} {!known && <b style={{ color: 'var(--bad)' }}>⚠ {t.cityWarn.split('(')[0]}</b>}</label>
          <input name="city" list="cities" defaultValue={o.city ?? ''} autoComplete="off" /></div></div>
      <datalist id="cities">{names.map((n) => <option key={n} value={n} />)}</datalist>
      <label>{t.address}</label><input name="address" defaultValue={o.address ?? ''} />
      <div className="row"><div><label>{t.product}</label><input name="products" defaultValue={o.products ?? ''} /></div>
        <div><label>{t.size}</label><input name="size" defaultValue={o.size ?? ''} /></div>
        <div><label>{t.color}</label><input name="color" defaultValue={o.color ?? ''} /></div>
        <div><label>{t.qty}</label><input name="quantity" type="number" min="1" defaultValue={o.quantity ?? 1} /></div>
        <div><label>{t.price}</label><input name="price" inputMode="decimal" defaultValue={o.price ?? 0} /></div></div>
      <label>{t.notes}</label><textarea name="notes" rows={2} defaultValue={o.notes ?? ''} />
      <p><button>{t.save}</button> <Link href={back}>✕</Link></p></form></div>);
}
