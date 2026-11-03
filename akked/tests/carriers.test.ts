import { beforeAll, describe, expect, it } from 'vitest';
process.env.AKKED_DB = ':memory:';
process.env.AKKED_SECRET = 'test-secret-test-secret';

let db: any, C: any, E: any, F: any;
beforeAll(async () => {
  db = (await import('../src/lib/db')).db; C = await import('../src/lib/carriers'); E = await import('../src/lib/exportEngine'); F = await import('../src/lib/carrierFlow');
  for (const id of [1, 2]) db().prepare(`INSERT INTO workspaces (id, name, plan, status, period_end) VALUES (?,?,'pro','active','2099-01-01')`).run(id, 'S' + id);
  const o = (ws: number, n: string, city: string, status = 'confirmed', extra = '') =>
    db().prepare(`INSERT INTO orders (workspace_id, order_number, customer_name, phone, city, address, products, size, quantity, price, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(ws, n, 'Client ' + n, '+2126123456' + n.slice(-2), city, 'Rue 1', 'Robe', 'M', 2, 199, status);
  o(1, 'AK-11', 'Casablanca'); o(1, 'AK-12', 'Fes'); o(1, 'AK-13', 'Villeinconnue'); o(1, 'AK-14', 'Rabat', 'new'); o(2, 'AK-21', 'Tanger');
});

describe('column suggestions (any carrier)', () => {
  it('guesses what French/Arabic/English headers mean', () => {
    const cases: Record<string, string> = {
      'NUMERO DE COMMANDE': 'order_number', 'Réf': 'order_number', 'DESTINATAIRE': 'customer_name', 'Nom du client': 'customer_name', 'الاسم': 'customer_name',
      'TELEPHONE': 'phone_national', 'GSM': 'phone_national', 'Mobile': 'phone_national', 'VILLE': 'city', 'Ville ID': 'city_id', 'City code': 'city_id',
      'ADRESSE': 'address', 'Adresse de livraison': 'address', 'PRIX': 'price', 'CRBT': 'price', 'Montant COD': 'price', 'MARCHANDISE': 'product_full', 'Désignation': 'product_full',
      'Quantité': 'quantity', 'COMMENTAIRE': 'notes', 'Observations': 'notes', 'Date': 'date', 'Poids': 'empty', 'Fragile': 'empty', 'Code': 'empty', 'Code postal': 'empty', 'COD': 'price',
    };
    for (const [h, s] of Object.entries(cases)) expect([h, E.suggestSource(h)]).toEqual([h, s]);
  });
});

describe('reading a carrier template', () => {
  it('finds the header row in xlsx (after a title row) and in csv with ; or tabs', async () => {
    const ExcelJS = (await import('exceljs')).default; const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('S');
    ws.getCell('A1').value = 'Bon de commande — Société X'; ws.getRow(3).values = ['Nom', 'Tel', 'Ville', 'CRBT'];
    const tpl = await E.readTemplate(new Uint8Array(await wb.xlsx.writeBuffer()), 'x.xlsx');
    expect(tpl).toMatchObject({ headerRow: 3, kind: 'xlsx' }); expect(tpl.headers.map((h: any) => h.header)).toEqual(['Nom', 'Tel', 'Ville', 'CRBT']);
    expect((await E.readTemplate(new TextEncoder().encode('Nom;Téléphone;Ville\n'), 'a.csv')).headers).toHaveLength(3);
    expect((await E.readTemplate(new TextEncoder().encode('Nom\tTel\n'), 'a.txt')).headers).toHaveLength(2);
    expect(await E.readTemplate(new TextEncoder().encode('onlyone'), 'a.csv')).toBeNull();
    expect(await E.readTemplate(new Uint8Array([0x50, 0x4b, 1, 2, 3]), 'broken.xlsx')).toBeNull(); // corrupt zip
  });
});

describe('rendering exports', () => {
  let rows: any[]; beforeAll(() => { rows = E.SAMPLE_ROWS; });
  it('fills the carrier’s own xlsx below its header row, phone stays text, formulas are neutralised', async () => {
    const ExcelJS = (await import('exceljs')).default; const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('S');
    ws.getRow(2).values = ['', 'Nom', 'Tel', 'Ville', 'ID ville', 'CRBT', 'Réf', 'Type'];
    const cfg = { headerRow: 2, output: 'xlsx', columns: [
      { col: 2, header: 'Nom', source: 'customer_name' }, { col: 3, header: 'Tel', source: 'phone_national' }, { col: 4, header: 'Ville', source: 'city' },
      { col: 5, header: 'ID ville', source: 'city_id' }, { col: 6, header: 'CRBT', source: 'price' }, { col: 7, header: 'Réf', source: 'fixed', fixed: '=HYPERLINK("x")' }, { col: 8, header: 'Type', source: 'empty' } ] };
    const out = await E.renderExport(cfg, new Uint8Array(await wb.xlsx.writeBuffer()), rows);
    expect(out.ext).toBe('xlsx');
    const r = new ExcelJS.Workbook(); await r.xlsx.load(out.bytes as any); const s = r.worksheets[0];
    expect(s.getRow(3).getCell(2).value).toBe('Sara Alaoui'); expect(s.getRow(3).getCell(3).value).toBe('0612345678'); expect(s.getRow(3).getCell(3).numFmt).toBe('@');
    expect(s.getRow(3).getCell(5).value).toBe('129'); expect(s.getRow(3).getCell(6).value).toBe(199); expect(s.getRow(3).getCell(7).value).toBe("'=HYPERLINK(\"x\")");
    expect(s.getRow(4).getCell(2).value).toBe('Youssef B.'); expect(s.getRow(2).getCell(2).value).toBe('Nom'); // header untouched
  });
  it('builds a CSV or a fresh xlsx when the company gave no template', async () => {
    const cfg = { headerRow: 1, output: 'csv', columns: [{ col: 1, header: 'Nom', source: 'customer_name' }, { col: 2, header: 'Produit', source: 'product_full' }, { col: 3, header: 'Tel', source: 'phone_e164' }] };
    const csv = (await E.renderExport(cfg, null, rows)).bytes.toString();
    expect(csv.split('\r\n')[0].replace('﻿', '')).toBe('Nom,Produit,Tel'); expect(csv).toContain('Robe M Noir x2'); expect(csv).toContain('+212612345678');
    const x = await E.renderExport({ ...cfg, output: 'xlsx' }, null, rows); expect(x.ext).toBe('xlsx');
  });
});

describe('carriers, credentials and tenancy', () => {
  let amx: number, other: number;
  it('creates AMEEX from its preset (own template + mapping) and keeps credentials encrypted', () => {
    amx = C.createFromPreset(1, 'ameex', { apiId: '11211', apiKey: 'SECRET' });
    const c = C.getCarrier(1, amx);
    expect(c).toMatchObject({ name: 'AMEEX', connector: 'ameex', has_template: true, has_creds: true });
    expect(db().prepare('SELECT creds_enc FROM carriers WHERE id = ?').get(amx).creds_enc).not.toContain('SECRET');
    expect(C.getCreds(1, amx)).toEqual({ apiId: '11211', apiKey: 'SECRET' });
    C.setCreds(1, amx, { apiId: '99', apiKey: '' }); expect(C.getCreds(1, amx)).toEqual({ apiId: '99', apiKey: 'SECRET' }); // blank secret keeps the old one
  });
  it('is isolated per seller', () => {
    expect(C.getCarrier(2, amx)).toBeNull(); expect(C.getCreds(2, amx)).toBeNull(); expect(C.listCarriers(2)).toHaveLength(0);
    C.deleteCarrier(2, amx); expect(C.getCarrier(1, amx)).not.toBeNull(); // another seller cannot delete it
  });
  it('AMEEX export matches the official template columns', async () => {
    const { rows } = C.exportRowsFor(1, C.getCarrier(1, amx), false);
    const out = await E.renderExport(C.getCarrier(1, amx).config, C.getTemplate(1, amx), rows);
    const ExcelJS = (await import('exceljs')).default; const wb = new ExcelJS.Workbook(); await wb.xlsx.load(out.bytes as any); const s = wb.worksheets[0];
    expect((s.getRow(1).values as any[]).slice(1)).toEqual(['NUMERO DE COMMANDE', 'DESTINATAIRE', 'TELEPHONE', 'ADRESSE', 'PRIX', 'VILLE', 'COMMENTAIRE', 'MARCHANDISE']);
    expect(s.getRow(2).getCell(6).value).toBe('Casablanca'); expect(s.getRow(2).getCell(8).value).toBe('Robe M x2');
  });
  it('other companies: a custom city list (ids or names), matched to customers’ spellings', () => {
    other = C.createCarrier(1, { name: 'Cathedis', config: { headerRow: 1, output: 'csv', columns: [{ col: 1, header: 'Ville', source: 'city' }, { col: 2, header: 'ID', source: 'city_id' }] } });
    const r = C.setCities(1, other, '10,Casa Blanca\n12;Fès\nTanger\n88,Ville Bizarre');
    expect(r.saved).toBe(4); expect(r.unmatched).toEqual(['Ville Bizarre']);
    const car = C.getCarrier(1, other);
    expect(C.resolveCity(car, 'casa')).toEqual({ id: '10', name: 'Casa Blanca', matched: true });
    expect(C.resolveCity(car, 'فاس')).toEqual({ id: '12', name: 'Fès', matched: true });
    expect(C.resolveCity(car, 'tanger')).toMatchObject({ id: '', name: 'Tanger', matched: true });
    expect(C.resolveCity(car, 'Ville Bizarre')).toMatchObject({ id: '88', matched: true });   // exact carrier spelling still works
    expect(C.resolveCity(car, 'Marrakech').matched).toBe(false);                               // list given, city missing → warn
    expect(C.resolveCity(C.getCarrier(1, other), '').matched).toBe(false);
    const { rows, unmatched } = C.exportRowsFor(1, car, true);
    expect(rows.map((x: any) => x.city_name)).toEqual(['Casa Blanca', 'Fès', 'Villeinconnue']); expect(unmatched).toEqual(['AK-13']);
    expect(db().prepare(`SELECT COUNT(*) c FROM orders WHERE workspace_id = 1 AND exported_at IS NOT NULL`).get().c).toBe(3); // confirmed ones only
    expect(db().prepare(`SELECT COUNT(*) c FROM orders WHERE workspace_id = 2 AND exported_at IS NOT NULL`).get().c).toBe(0);
  });
  it('a carrier with no list and no API accepts any city text; AMEEX falls back to its built-in ids', () => {
    const free = C.createCarrier(1, { name: 'Free text' });
    expect(C.resolveCity(C.getCarrier(1, free), 'casa')).toMatchObject({ name: 'Casablanca', matched: true });
    expect(C.resolveCity(C.getCarrier(1, amx), 'casa')).toEqual({ id: '129', name: 'Casablanca', matched: true });
    expect(C.resolveCity(C.getCarrier(1, amx), 'Atlantis').matched).toBe(false);
  });
  it('sending needs an API connector: file-only companies are refused cleanly', async () => {
    const id = (db().prepare(`SELECT id FROM orders WHERE order_number = 'AK-11'`).get() as any).id;
    expect(await F.sendOrderViaCarrier(1, null, id, other, (async () => { throw new Error('no'); }) as any)).toEqual({ ok: false, error: 'noconnector' });
    expect(await F.sendOrderViaCarrier(2, null, id, amx)).toEqual({ ok: false, error: 'notfound' }); // other tenant's order
  });
  it('deleting a carrier removes its cities but keeps the orders', () => {
    C.deleteCarrier(1, other);
    expect(db().prepare('SELECT COUNT(*) c FROM carrier_cities WHERE carrier_id = ?').get(other).c).toBe(0);
    expect(db().prepare(`SELECT COUNT(*) c FROM orders WHERE workspace_id = 1`).get().c).toBe(4);
  });
});

describe('uploading a new version of the carrier model', () => {
  it('keeps the seller’s choices for headers that still exist (accents/case/spacing ignored), suggests for new ones', () => {
    const old = [
      { col: 1, header: 'Nom du client', source: 'customer_name' }, { col: 2, header: 'GSM', source: 'phone_e164' },
      { col: 3, header: 'Type', source: 'fixed', fixed: 'COD' }, { col: 4, header: 'Poids', source: 'empty' },
    ];
    const next = [
      { col: 1, header: 'Réf', }, { col: 2, header: 'NOM DU  CLIENT' }, { col: 3, header: 'Gsm' }, { col: 4, header: 'Ville' }, { col: 5, header: 'type' }, { col: 6, header: 'Poids' },
    ].map((h: any) => ({ ...h, header: h.header }));
    const m = E.mergeMapping(old as any, next as any);
    expect(m.columns.map((c: any) => c.source)).toEqual(['order_number', 'customer_name', 'phone_e164', 'city', 'fixed', 'empty']);
    expect(m.columns[4].fixed).toBe('COD');       // fixed value kept
    expect(m.columns[2].source).toBe('phone_e164'); // the seller's non-default choice survives (default would be phone_national)
    expect(m.added).toBe(2);                        // "Réf" and "Ville" are new
  });
  it('can swap the stored template and mapping', () => {
    const id = C.createCarrier(1, { name: 'Swap', config: { headerRow: 1, output: 'xlsx', columns: [] }, template: new Uint8Array([0x50, 0x4b, 1]), templateName: 'old.xlsx' });
    C.setTemplate(1, id, null, 'new.csv');
    expect(C.getTemplate(1, id)).toBeNull(); expect(C.getCarrier(1, id).template_name).toBe('new.csv');
    C.setTemplate(2, id, new Uint8Array([1]), 'hack.xlsx');   // other seller can't touch it
    expect(C.getCarrier(1, id).template_name).toBe('new.csv');
  });
});
