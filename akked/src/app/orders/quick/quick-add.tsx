'use client';
import { useState } from 'react';
import { parseOrdersText, type Draft } from '@/lib/freetext';
import { normalizePhone } from '@/lib/phone';
import { quickAddOrders } from '../../actions';

type L = Record<string, string>;
export default function QuickAdd({ t }: { t: L }) {
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const upd = (i: number, k: keyof Draft, v: string) => setDrafts((d) => d.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <form action={quickAddOrders}>
      <textarea rows={6} value={text} placeholder={t.exampleOrder} autoFocus
        onChange={(e) => { setText(e.target.value); setDrafts(parseOrdersText(e.target.value)); }} />
      <p className="muted">{t.parseHint}</p>
      {drafts.length > 0 && <>
        <h2>{t.foundN}: {drafts.length}</h2>
        {drafts.map((d, i) => {
          const ok = !!normalizePhone(d.phone) && !!d.customer_name;
          return (
            <div key={i} className="card" style={{ borderColor: ok ? undefined : 'var(--bad)' }}>
              <div className="row">
                <div><label>{t.name}</label><input value={d.customer_name} onChange={(e) => upd(i, 'customer_name', e.target.value)} /></div>
                <div><label>{t.phone} {!normalizePhone(d.phone) && <b style={{ color: 'var(--bad)' }}>· {t.badPhone}</b>}</label>
                  <input dir="ltr" inputMode="tel" value={d.phone} onChange={(e) => upd(i, 'phone', e.target.value)} /></div>
                <div><label>{t.city}</label><input value={d.city} onChange={(e) => upd(i, 'city', e.target.value)} /></div>
                <div><label>{t.price}</label><input inputMode="decimal" value={d.price} onChange={(e) => upd(i, 'price', e.target.value)} /></div>
              </div>
              <div className="row">
                <div><label>{t.product}</label><input value={d.products} onChange={(e) => upd(i, 'products', e.target.value)} /></div>
                <div><label>{t.address}</label><input value={d.address} onChange={(e) => upd(i, 'address', e.target.value)} /></div>
              </div>
              <p><button type="button" className="sec" onClick={() => setDrafts((x) => x.filter((_, j) => j !== i))}>{t.remove}</button></p>
            </div>);
        })}
        <input type="hidden" name="drafts" value={JSON.stringify(drafts)} />
        <button className="big">{t.saveAll} ({drafts.length})</button>
      </>}
    </form>
  );
}
