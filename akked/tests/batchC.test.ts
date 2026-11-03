import { beforeAll, describe, expect, it } from 'vitest';
process.env.AKKED_DB = ':memory:';
process.env.AKKED_SECRET = 'test-secret-test-secret';

let db: any, orders: any, flow: any, sheets: any, secrets: any;
const ins = (ws: number, n: string, status: string, extra: Record<string, any> = {}) => {
  const o: any = { city: 'Casablanca', address: 'Rue 1', price: 100, ...extra };
  db().prepare(`INSERT INTO orders (workspace_id, order_number, customer_name, phone, city, address, price, status, callback_at, ameex_parcel_code) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(ws, n, 'C' + n, '+2126000000' + String(n).padStart(2, '0'), o.city, o.address, o.price, status, o.callback_at ?? null, o.code ?? null);
};
beforeAll(async () => {
  db = (await import('../src/lib/db')).db; orders = await import('../src/lib/orders'); flow = await import('../src/lib/ameexFlow');
  sheets = await import('../src/lib/sheets'); secrets = await import('../src/lib/secrets');
  db().prepare(`INSERT INTO workspaces (id, name, plan, status, period_end, ameex_api_id, ameex_api_key_enc) VALUES (1,'S','pro','active','2099-01-01','77',?)`).run(secrets.encrypt('KEY'));
  db().prepare(`INSERT INTO workspaces (id, name, plan, status, period_end) VALUES (2,'Nokey','pro','active','2099-01-01')`).run();
});

describe('lanes', () => {
  it('splits new / waiting for reply / to call (no answer + due callbacks)', () => {
    ins(1, '1', 'new'); ins(1, '2', 'message_sent'); ins(1, '3', 'no_answer'); ins(1, '4', 'callback', { callback_at: '2000-01-01T10:00' }); ins(1, '5', 'callback', { callback_at: '2999-01-01T10:00' });
    expect(orders.queueCounts(1)).toEqual({ send: 1, reply: 1, call: 2 });
    expect(orders.queue(1, 'call').next.order_number).toBe('4'); // oldest callback first
  });
});

describe('AMEEX status mapping', () => {
  it('is conservative', () => {
    for (const s of ['Livré', 'Delivered', 'تم التسليم', 'colis livré']) expect(flow.mapAmeexStatus(s)).toBe('delivered');
    for (const s of ['Retourné', 'Retour', 'Refusé', 'Returned', 'مرتجع', 'Non livré']) expect(flow.mapAmeexStatus(s)).toBe('returned');
    for (const s of ['En cours', 'Ramassé', 'In transit', '', null]) expect(flow.mapAmeexStatus(s as any)).toBeNull();
    expect(flow.extractStatusText({ data: { parcel: { status: { name: 'Livré' } } } })).toBe('Livré');
    expect(flow.extractStatusText({ x: [{ statut: 'Retour' }] })).toBe('Retour');
    expect(flow.extractStatusText('nope')).toBeNull();
  });
});

describe('bulk send to AMEEX', () => {
  it('sends the ready ones and explains the rest', async () => {
    ins(1, '10', 'confirmed'); ins(1, '11', 'confirmed', { address: '' }); ins(1, '12', 'confirmed', { city: 'Atlantis' }); ins(1, '13', 'confirmed');
    const calls: string[] = []; let n = 0;
    const fake = (async (url: string, init: any) => { calls.push(init.headers['C-Api-Id']); return new Response(JSON.stringify({ data: { ParcelCode: 'P' + ++n } }), { status: 200 }); }) as any;
    const r = await flow.bulkSendToAmeex(1, null, fake);
    expect(r.sent).toBe(2); expect(calls).toEqual(['77', '77']);
    expect(r.failed.map((f: any) => f.error).sort()).toEqual(['noaddress', 'nocity']);
    const sent = db().prepare(`SELECT status, ameex_parcel_code FROM orders WHERE order_number = '10'`).get();
    expect(sent).toMatchObject({ status: 'shipped', ameex_parcel_code: 'P1' });
    expect(db().prepare(`SELECT status FROM orders WHERE order_number = '11'`).get().status).toBe('confirmed');
    expect((await flow.bulkSendToAmeex(1, null, fake)).sent).toBe(0); // nothing is sent twice
  });
  it('stops cleanly without credentials and never touches another tenant', async () => {
    ins(2, '20', 'confirmed');
    const r = await flow.bulkSendToAmeex(2, null, (async () => { throw new Error('must not call'); }) as any);
    expect(r.sent).toBe(0); expect(r.failed[0].error).toBe('nocreds');
  });
});

describe('tracking', () => {
  it('applies delivered/returned, keeps raw status for the rest', async () => {
    ins(1, '30', 'shipped', { code: 'T-DEL' }); ins(1, '31', 'shipped', { code: 'T-RET' }); ins(1, '32', 'shipped', { code: 'T-WAY' }); ins(1, '33', 'shipped', { code: 'SENT' });
    const map: Record<string, string> = { 'T-DEL': 'Livré', 'T-RET': 'Retourné', 'T-WAY': 'En cours de livraison' };
    const fake = (async (url: string) => new Response(JSON.stringify({ status: map[decodeURIComponent(url.split('ParcelCode=')[1])] }), { status: 200 })) as any;
    const r = await flow.trackWorkspace(1, fake);
    expect(r).toMatchObject({ checked: 5, delivered: 1, returned: 1 });
    const st = (n: string) => db().prepare(`SELECT status, ameex_status FROM orders WHERE order_number = ?`).get(n);
    expect(st('30')).toMatchObject({ status: 'delivered', ameex_status: 'Livré' });
    expect(st('31').status).toBe('returned');
    expect(st('32')).toMatchObject({ status: 'shipped', ameex_status: 'En cours de livraison' });
    expect(st('33').status).toBe('shipped'); // placeholder code can't be tracked
    const s = orders.stats(1); expect(s.delivered).toBe(1); expect(s.returned).toBe(1); expect(s.returnRate).toBe(0.5);
  });
});

describe('google sheets sync', () => {
  const ID = 'abcdefghijklmnopqrstuvwxyz0123';
  it('only accepts docs.google.com sheet links', () => {
    expect(sheets.parseSheetUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=123`)).toEqual({ id: ID, gid: '123' });
    expect(sheets.parseSheetUrl(`https://docs.google.com/spreadsheets/d/${ID}/edit`)).toEqual({ id: ID, gid: '0' });
    for (const bad of ['http://docs.google.com/spreadsheets/d/' + ID, `https://evil.com/spreadsheets/d/${ID}`, `https://docs.google.com.evil.com/spreadsheets/d/${ID}`, 'http://169.254.169.254/', 'nope', `https://docs.google.com/document/d/${ID}`]) expect(sheets.parseSheetUrl(bad)).toBeNull();
  });
  it('imports new rows once, survives re-sorting, handles duplicates and unshared sheets', async () => {
    db().prepare(`UPDATE workspaces SET sheet_url = ? WHERE id = 1`).run(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=0`);
    const csv = (rows: string[]) => 'name,phone,city,product,price\n' + rows.join('\n');
    const A = 'Sara,0612345678,casa,Robe,199', B = 'Omar,0655443322,tanger,Veste,250';
    const serve = (body: string, type = 'text/csv') => (async () => new Response(body, { status: 200, headers: { 'content-type': type } })) as any;
    const before = (db().prepare(`SELECT COUNT(*) c FROM orders WHERE workspace_id = 1`).get() as any).c;
    expect(await sheets.syncSheet(1, serve(csv([A, B, A])))).toMatchObject({ ok: true, added: 3 });          // the same order twice is legit
    expect((db().prepare(`SELECT COUNT(*) c FROM orders WHERE workspace_id = 1`).get() as any).c).toBe(before + 3);
    expect(await sheets.syncSheet(1, serve(csv([A, B, A])))).toMatchObject({ ok: true, added: 0 });          // nothing new
    expect(await sheets.syncSheet(1, serve(csv([B, A, A])))).toMatchObject({ ok: true, added: 0 });          // re-sorted: still nothing new
    expect(await sheets.syncSheet(1, serve(csv([B, A, A, 'Hind,0700112233,fes,Sac,120'])))).toMatchObject({ ok: true, added: 1 });
    expect(await sheets.syncSheet(1, serve(csv([A, A, A])))).toMatchObject({ ok: true, added: 1 });           // a third identical order
    expect((await sheets.syncSheet(1, serve('<html>sign in</html>', 'text/html'))).error).toBe('not_shared');
    expect((await sheets.syncSheet(1, (async () => { throw new Error('x'); }) as any)).error).toBe('network');
    const city = db().prepare(`SELECT city, source FROM orders WHERE workspace_id = 1 AND customer_name = 'Sara' LIMIT 1`).get();
    expect(city).toMatchObject({ city: 'Casablanca', source: 'sheet' });
    expect(db().prepare('SELECT sheet_last_result FROM workspaces WHERE id = 1').get().sheet_last_result).toMatch(/^error/);
  });
});
