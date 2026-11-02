import { requireSession } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { addOrder } from '../../actions';
export default async function NewOrder({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireSession(); const { t } = await getT(); const sp = await searchParams;
  const msg = sp.error === 'phone' ? t.invalidPhone : sp.error === 'limit' ? t.limitReached : sp.error === 'expired' ? t.expired : sp.error ? '✖' : '';
  return (<div className="card"><h1>{t.newOrder}</h1>{msg && <div className="err">{msg}</div>}
    <form action={addOrder}>
      <div className="row"><div><label>{t.name}</label><input name="customer_name" required /></div>
        <div><label>{t.phone}</label><input name="phone" type="tel" inputMode="tel" dir="ltr" placeholder="06XXXXXXXX" required /></div>
        <div><label>{t.city}</label><input name="city" /></div></div>
      <label>{t.address}</label><input name="address" />
      <div className="row"><div><label>{t.product}</label><input name="products" /></div>
        <div><label>{t.size}</label><input name="size" /></div><div><label>{t.color}</label><input name="color" /></div>
        <div><label>{t.qty}</label><input name="quantity" type="number" min="1" defaultValue="1" /></div>
        <div><label>{t.price}</label><input name="price" inputMode="decimal" /></div></div>
      <label>{t.notes}</label><textarea name="notes" rows={2} />
      <p><button>{t.save}</button></p></form></div>);
}
