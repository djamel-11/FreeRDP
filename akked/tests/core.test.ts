import { describe, expect, it } from 'vitest';
import { normalizePhone } from '../src/lib/phone';
import { renderTemplate, waLink } from '../src/lib/templates';
import { canAddOrders } from '../src/lib/plans';
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
    expect(ws.getRow(2).values).toEqual([undefined, 'AK-1', 'Sara', '0612345678', 'Rue 1', 199, 'Casa', 'n', 'Robe M x2']);
  });
});
