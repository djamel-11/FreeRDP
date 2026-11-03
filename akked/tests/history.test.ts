import { beforeAll, describe, expect, it } from 'vitest';
process.env.AKKED_DB = ':memory:';
let db: any, H: any, R: any, O: any;
beforeAll(async () => {
  db = (await import('../src/lib/db')).db; H = await import('../src/lib/history'); R = await import('../src/lib/tableReader'); O = await import('../src/lib/orders');
  for (const id of [1, 2]) db().prepare(`INSERT INTO workspaces (id, name, plan, status, period_end) VALUES (?,?,'starter','active','2099-01-01')`).run(id, 'S' + id);
});
const enc = (s: string) => new TextEncoder().encode(s);

describe('reading a carrier export', () => {
  it('finds headers in csv (; or ,) even under a title line, ignores empty rows', async () => {
    const t = await R.readTable(enc('Liste des colis;;;\nCode;Destinataire;Téléphone;Ville;Montant;Statut;Date\nM1;Sara;0612345678;Casa;199;Livré;12/10/2026\n;;;;;;\nM2;Omar;655443322;Tanger;250,5;Retourné;2026-10-13\n'), 'x.csv');
    expect(t.headers.map((h: any) => h.header)).toEqual(['Code', 'Destinataire', 'Téléphone', 'Ville', 'Montant', 'Statut', 'Date']);
    expect(t.rows).toHaveLength(2);
  });
  it('reads xlsx with dates and numeric phones', async () => {
    const ExcelJS = (await import('exceljs')).default; const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('S');
    ws.getRow(2).values = ['Nom', 'GSM', 'Prix', 'Date']; ws.getRow(3).values = ['Sara', 612345678, 199, new Date('2026-10-12T00:00:00Z')];
    const t = await R.readTable(new Uint8Array(await wb.xlsx.writeBuffer()), 'a.xlsx');
    expect(t.headerRow).toBe(2); expect(t.rows[0]).toEqual(['Sara', '612345678', '199', '2026-10-12']);
    expect(await R.readTable(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]), 'old.xls')).toBeNull();
    expect(await R.readTable(enc('x'), 'a.csv')).toBeNull();
  });
});

describe('suggestions', () => {
  it('guesses columns and statuses (French/Arabic/English)', () => {
    const f: Record<string, string> = { Destinataire: 'customer_name', 'Téléphone': 'phone', Ville: 'city', Montant: 'price', Statut: 'status', Date: 'date', 'Code colis': 'parcel_code', 'N° commande': 'order_number', 'Adresse': 'address', Marchandise: 'products', 'Nbr colis': 'quantity', Poids: 'ignore', 'الحالة': 'status' };
    for (const [h, want] of Object.entries(f)) expect([h, H.suggestField(h)]).toEqual([h, want]);
    for (const [s, want] of Object.entries({ 'Livré': 'delivered', 'Retourné': 'returned', 'Refusé par le client': 'returned', 'Annulé': 'cancelled', 'En cours de livraison': 'shipped', 'Ramassé': 'shipped', 'مرتجع': 'returned' })) expect([s, H.suggestStatus(s)]).toEqual([s, want]);
    expect(H.parseDate('12/10/2026')).toBe('2026-10-12 00:00:00'); expect(H.parseDate('2026-10-13 14:05:09')).toBe('2026-10-13 14:05:09');
    expect(H.parseDate('13/13/2026')).toBeNull(); expect(H.parseDate('hello')).toBeNull(); expect(H.parseDate('')).toBeNull();
  });
});

describe('importing history', () => {
  const csv = 'Code;Destinataire;Téléphone;Ville;Montant;Statut;Date\nM1;Sara;0612345678;casa;199;Livré;12/10/2026\nM2;Omar;655443322;Tanger;250,5;Retourné;13/10/2026\nM3;Hind;0700112233;Fes;120;En cours;14/10/2026\nM4;Bad;123;Rabat;10;Livré;15/10/2026\nM5;Karim;0666000111;Rabat;90;Refusé;16/10/2026';
  it('imports as history: right statuses, not in the queue, not in the monthly quota, badge works', async () => {
    const t = await R.readTable(enc(csv), 'h.csv'); const fields = H.defaultFields(t);
    expect(Object.values(fields).filter((v: any) => v === 'status')).toHaveLength(1);
    expect(H.distinctStatuses(t, fields).sort()).toEqual(['En cours', 'Livré', 'Refusé', 'Retourné']);
    const plan = H.planImport(t, { fields, statusMap: { 'Refusé': 'returned' }, defaultStatus: 'shipped' });
    expect(plan.invalid).toBe(1); expect(plan.rows).toHaveLength(4);
    expect(plan.rows.map((r: any) => r.status)).toEqual(['delivered', 'returned', 'shipped', 'returned']);
    expect(plan.rows[0]).toMatchObject({ phone: '+212612345678', city: 'Casablanca', price: 199, created_at: '2026-10-12 00:00:00' });
    expect(plan.rows[1]).toMatchObject({ phone: '+212655443322', price: 250.5 });
    expect(H.importHistory(1, plan.rows)).toEqual({ added: 4, duplicates: 0 });
    expect(O.queueCounts(1)).toEqual({ send: 0, reply: 0, call: 0 });                       // nothing for the agents to message
    expect(O.monthlyUsage(1, new Date('2026-10-20T00:00:00Z'))).toBe(0);                    // history doesn't eat the plan quota
    db().prepare(`INSERT INTO orders (workspace_id, order_number, customer_name, phone, status) VALUES (1,'AK-9','Omar again','+212655443322','new')`).run();
    expect(O.listOrders(1, { q: 'Omar again' })[0].refusals).toBe(1);                         // the "refused before" warning now works
    expect(db().prepare(`SELECT COUNT(*) c FROM orders WHERE source = 'history' AND order_number IS NOT NULL`).get().c).toBe(4);
    expect(O.stats(1).returned).toBe(2);
  });
  it('re-importing the same file adds nothing; another seller is unaffected', async () => {
    const t = await R.readTable(enc(csv), 'h.csv'); const plan = H.planImport(t, { fields: H.defaultFields(t), statusMap: {}, defaultStatus: 'shipped' });
    expect(H.importHistory(1, plan.rows)).toEqual({ added: 0, duplicates: 4 });
    expect(H.importHistory(2, plan.rows).added).toBe(4);
    expect(db().prepare(`SELECT COUNT(*) c FROM orders WHERE workspace_id = 2`).get().c).toBe(4);
  });
});
