import { describe, expect, it } from 'vitest';
import { normalizePhone } from '../src/lib/phone';
import { renderTemplate, waLink } from '../src/lib/templates';
import { canAddOrders } from '../src/lib/plans';
import { ameexIdFor, canonicalCity } from '../src/lib/cities';
import { parseOrders } from '../src/lib/import';
import { FORMATS, toCsv, toXlsx } from '../src/lib/exporters';

describe('phone', () => {
  it('normalizes', () => {
    for (const p of ['0612345678', '06 12-34 56 78', '+212612345678', '00212612345678', '212612345678', '612345678'])
      expect(normalizePhone(p)).toBe('+212612345678');
    expect(normalizePhone('0712345678')).toBe('+212712345678');
  });
  it('rejects invalid', () => {
    for (const p of ['0522345678', '123', '', null, '06123']) expect(normalizePhone(p as any)).toBeNull();
  });
});
describe('templates', () => {
  it('renders and builds wa.me', () => {
    expect(renderTemplate('Hi {name} {city} {x}', { name: 'Sara', city: 'Fès' })).toBe('Hi Sara Fès {x}');
    expect(waLink('+212612345678', 'a b')).toBe('https://wa.me/212612345678?text=a%20b');
  });
});
describe('plan limits', () => {
  const future = new Date(Date.now() + 864e5).toISOString();
  it('enforces', () => {
    const w = { plan: 'starter' as const, status: 'active', period_end: future };
    expect(canAddOrders(w, 299).ok).toBe(true);
    expect(canAddOrders(w, 300)).toEqual({ ok: false, reason: 'limit' });
    expect(canAddOrders({ ...w, plan: 'business' }, 1e6).ok).toBe(true);
    expect(canAddOrders({ ...w, status: 'suspended' }, 0).reason).toBe('expired');
    expect(canAddOrders({ ...w, period_end: '2000-01-01' }, 0).reason).toBe('expired');
  });
});
describe('import/export', () => {
  it('parses csv, skips bad phones', () => {
    const r = parseOrders('name,phone,city,price\nSara,0612345678,Casa,199\nBad,123,Rabat,10');
    expect(r.rows).toHaveLength(1); expect(r.errors).toEqual([{ line: 3, reason: 'invalid_phone' }]);
    expect(r.rows[0]).toMatchObject({ phone: '+212612345678', price: 199 });
  });
  it('exports with national phone and formula guard', () => {
    const csv = toCsv(FORMATS.ameex, [{ order_number: 'AK-1', customer_name: '=cmd', phone: '+212612345678', city: 'Casa', address: '', products: 'Robe', size: 'M', color: '', quantity: 1, price: 199, notes: '' }]);
    expect(csv).toContain('0612345678');
    expect(csv.split('\r\n')[0].replace('\uFEFF','')).toBe('NUMERO DE COMMANDE,DESTINATAIRE,TELEPHONE,ADRESSE,PRIX,VILLE,COMMENTAIRE,MARCHANDISE'); expect(csv).toContain("'=cmd");
  });
  it('builds AMEEX xlsx from the official template', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const o = { order_number: 'AK-1', customer_name: 'Sara', phone: '+212612345678', city: 'Casa', address: 'Rue 1', products: 'Robe', size: 'M', color: '', quantity: 2, price: 199, notes: 'n' };
    const buf = await toXlsx(FORMATS.ameex, [o], 'templates/AMEEX_MODELE.xlsx');
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf as any);
    const ws = wb.worksheets[0];
    expect(ws.getRow(1).getCell(1).value).toBe('NUMERO DE COMMANDE');
    expect(ws.getRow(2).values).toEqual([undefined, 'AK-1', 'Sara', '0612345678', 'Rue 1', 199, 'Casablanca', 'n', 'Robe M x2']);
  });
});

describe('cities', () => {
  it('canonicalizes to the AMEEX spelling and finds ids', () => {
    expect(canonicalCity('casa')).toBe('Casablanca');
    expect(canonicalCity('  الدار البيضاء ')).toBe('Casablanca');
    expect(canonicalCity('FÈS')).toBe('Fes');
    expect(canonicalCity('فاس')).toBe('Fes');
    expect(canonicalCity('Kénitra')).toBe('Kenitra');
    expect(canonicalCity('Marakech')).toBe('Marrakech');
    expect(canonicalCity('Tetouane')).toBe('Tetouan');
    expect(canonicalCity('Berrechid')).toBe('Berrchid');
    expect(canonicalCity('Atlantis')).toBeNull();
    expect(canonicalCity('')).toBeNull();
    const ids = Object.fromEntries(['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Fes', 'Agadir', 'Kenitra', 'Sale'].map((n) => [n, ameexIdFor(n)]));
    expect(ids).toEqual({ Casablanca: 129, Rabat: 49, Marrakech: 1, Tanger: 98, Fes: 69, Agadir: 63, Kenitra: 33, Sale: 50 });
    expect(ameexIdFor('Atlantis')).toBeNull();
    for (const c of ['Azrou', 'Sidi Slimane', 'Benslimane', 'Larache', 'Ouarzazate', 'Taroudant']) expect(ameexIdFor(canonicalCity(c))).not.toBeNull();
    expect(ameexIdFor(canonicalCity('Taroudant'))).toBe(102);
  });
});

import { buildParcelForm, extractParcelCode, sendParcel } from '../src/lib/ameex';
import { decrypt, encrypt } from '../src/lib/secrets';
describe('ameex api', () => {
  const o = { id: 1, order_number: 'AK-1', customer_name: 'Sara', phone: '+212612345678', address: 'Rue 1', city: 'Casa', notes: '', products: 'Robe', size: 'M', color: '', quantity: 2, price: 199 };
  it('builds the documented form', () => {
    const f = buildParcelForm(o, '77', 5);
    expect(Object.fromEntries(f.entries())).toMatchObject({ type: 'SIMPLE', business: '77', city: '5', phone: '0612345678', cod: '199', receiver: 'Sara', product: 'Robe M x2', replace: 'false' });
  });
  it('sends with headers and extracts code', async () => {
    let seen: any;
    const fake = (async (url: string, init: any) => { seen = { url, init }; return new Response(JSON.stringify({ data: { ParcelCode: 'MRK1' } }), { status: 200 }); }) as any;
    const r = await sendParcel({ apiId: '77', apiKey: 'k' }, o, 5, fake);
    expect(r).toMatchObject({ ok: true, parcelCode: 'MRK1' });
    expect(seen.init.headers).toEqual({ 'C-Api-Id': '77', 'C-Api-Key': 'k' });
    expect(seen.url).toBe('https://api.ameex.app/customer/Delivery/Parcels/Action/Type/Add');
  });
  it('handles rejection, network errors, missing address', async () => {
    expect((await sendParcel({ apiId: '1', apiKey: 'k' }, o, 5, (async () => new Response('{"status":false}', { status: 200 })) as any)).ok).toBe(false);
    expect((await sendParcel({ apiId: '1', apiKey: 'k' }, o, 5, (async () => { throw new Error('boom'); }) as any)).error).toBe('network');
    expect((await sendParcel({ apiId: '1', apiKey: 'k' }, { ...o, address: ' ' }, 5)).error).toBe('address_required');
    expect(extractParcelCode(null)).toBeNull();
  });
  it('encrypts keys round-trip', () => {
    process.env.AKKED_SECRET = 'test-secret-test-secret';
    const e = encrypt('abc'); expect(e).not.toContain('abc'); expect(decrypt(e)).toBe('abc');
    expect(() => decrypt(e.replace(/.$/, 'A'))).toThrow();
  });
});

import { parseOrdersText } from '../src/lib/freetext';
describe('free text orders', () => {
  it('parses labelled French', () => {
    const [d] = parseOrdersText('Nom: Sara Alaoui\nTel: 06 12 34 56 78\nVille: casa\nAdresse: Rue 5 n 3\nProduit: Robe rouge\nPrix: 199 dh');
    expect(d).toMatchObject({ customer_name: 'Sara Alaoui', phone: '+212612345678', city: 'Casablanca', address: 'Rue 5 n 3', products: 'Robe rouge', price: '199' });
  });
  it('parses labelled Arabic', () => {
    const [d] = parseOrdersText('الاسم: فاطمة\nالهاتف: 0661223344\nالمدينة: فاس\nالمنتج: قفطان\nالثمن: 350 درهم');
    expect(d).toMatchObject({ customer_name: 'فاطمة', phone: '+212661223344', city: 'Fes', products: 'قفطان', price: '350' });
  });
  it('parses unlabelled lines', () => {
    const [d] = parseOrdersText('Hind\n0700112233\nMarrakech\nSac cuir\n120 dh');
    expect(d).toMatchObject({ customer_name: 'Hind', phone: '+212700112233', city: 'Marrakech', products: 'Sac cuir', price: '120' });
  });
  it('parses one-line orders, several at once', () => {
    const r = parseOrdersText('Sara 0612345678 casa robe 199dh\nOmar 0655443322 tanger chemise XL 180 dh');
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ customer_name: 'Sara', phone: '+212612345678', city: 'Casablanca', products: 'robe', price: '199' });
    expect(r[1]).toMatchObject({ customer_name: 'Omar', city: 'Tanger', price: '180' });
  });
  it('splits blocks by blank line and ignores empty', () => {
    expect(parseOrdersText('Nom: A\nTel: 0612345678\n\nNom: B\nTel: 0700112233')).toHaveLength(2);
    expect(parseOrdersText('  ')).toEqual([]);
  });
  it('handles a mixed paste without blank lines', () => {
    const r = parseOrdersText('سارة 0612345678 كازا فستان 199 درهم\nYoussef 0661223344 fes veste L 250 dh\nNom: Hind\nTel: 07 00 11 22 33');
    expect(r.map((d) => d.phone)).toEqual(['+212612345678', '+212661223344', '+212700112233']);
    expect(r[2].customer_name).toBe('Hind');
    expect(r[0]).toMatchObject({ customer_name: 'سارة', city: 'Casablanca', price: '199' });
  });
});
