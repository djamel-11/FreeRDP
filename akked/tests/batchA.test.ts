import { beforeAll, describe, expect, it } from 'vitest';
process.env.AKKED_DB = ':memory:';

let db: any, orders: any, rl: any, pw: any, tpl: any;
beforeAll(async () => {
  db = (await import('../src/lib/db')).db;
  orders = await import('../src/lib/orders');
  rl = await import('../src/lib/ratelimit');
  pw = await import('../src/lib/password');
  tpl = await import('../src/lib/templates');
  const d = db();
  d.prepare(`INSERT INTO workspaces (id, name, plan, status, period_end) VALUES (1,'Chic Mode','pro','active','2099-01-01')`).run();
  d.prepare(`INSERT INTO workspaces (id, name, plan, status, period_end) VALUES (2,'Other','pro','active','2099-01-01')`).run();
  for (const [id, ws, role] of [[1, 1, 'owner'], [2, 1, 'agent'], [3, 2, 'owner']] as const)
    d.prepare(`INSERT INTO users (id, workspace_id, email, password_hash, role) VALUES (?,?,?,?,?)`).run(id, ws, `u${id}@x.com`, 'x:y', role);
  for (const n of [1, 2, 3])
    d.prepare(`INSERT INTO orders (workspace_id, order_number, customer_name, phone, status) VALUES (1,?,?,?, 'new')`).run('AK-' + n, 'C' + n, '+21261234567' + n);
});

describe('claiming', () => {
  it('two agents never get the same order, and releasing works', () => {
    const a = orders.queue(1, 'send', [], 1).next;
    const b = orders.queue(1, 'send', [], 2).next;
    expect(a.id).not.toBe(b.id);
    expect(orders.queue(1, 'send', [], 1).next.id).toBe(a.id); // same agent keeps their order
    orders.changeStatus(1, 1, a.id, 'message_sent');            // done → released + moves lane
    const c = orders.queue(1, 'send', [], 1).next;
    expect([a.id, b.id]).not.toContain(c.id);
  });
  it('an abandoned claim expires after 10 minutes', () => {
    db().prepare(`UPDATE orders SET claimed_at = datetime('now','-11 minutes') WHERE claimed_by IS NOT NULL`).run();
    expect(orders.queue(1, 'send', [], 1).next).toBeTruthy();
  });
});

describe('editing orders', () => {
  const base = { customer_name: 'Sara', phone: '0612345678', city: 'casa', address: 'Rue 1', products: 'Robe', size: 'M', color: '', quantity: '2', price: '199,50', notes: '' };
  it('normalises phone, city and price and logs the changes', () => {
    const id = (db().prepare(`SELECT id FROM orders WHERE workspace_id = 1 LIMIT 1`).get() as any).id;
    expect(orders.updateOrder(1, 1, id, base)).toEqual({ ok: true });
    const o = orders.getOrder(1, id);
    expect(o).toMatchObject({ customer_name: 'Sara', phone: '+212612345678', city: 'Casablanca', quantity: 2, price: 199.5 });
    const ev = db().prepare(`SELECT note FROM order_events WHERE order_id = ? ORDER BY id DESC LIMIT 1`).get(id) as any;
    expect(ev.note).toMatch(/^edit: .*city/);
  });
  it('rejects bad input and other tenants', () => {
    const id = (db().prepare(`SELECT id FROM orders WHERE workspace_id = 1 LIMIT 1`).get() as any).id;
    expect(orders.updateOrder(1, 1, id, { ...base, phone: '123' }).error).toBe('phone');
    expect(orders.updateOrder(1, 1, id, { ...base, customer_name: ' ' }).error).toBe('name');
    expect(orders.updateOrder(2, 3, id, base).error).toBe('not_found'); // workspace 2 cannot edit workspace 1's order
  });
});

describe('rate limiting', () => {
  it('blocks after repeated failures and resets', () => {
    for (let i = 0; i < 8; i++) rl.recordFail('login:a@x.com');
    expect(rl.tooMany('login:a@x.com')).toBe(true);
    expect(rl.tooMany('login:b@x.com')).toBe(false);
    rl.clearFails('login:a@x.com'); expect(rl.tooMany('login:a@x.com')).toBe(false);
    for (let i = 0; i < 8; i++) rl.recordFail('k', 1000);
    expect(rl.tooMany('k', 8, 1000 + 16 * 60e3)).toBe(false); // window expired
  });
});

describe('recovery code & passwords', () => {
  it('round-trips a recovery code regardless of formatting', () => {
    const code = pw.generateRecoveryCode();
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const h = pw.hashPassword(pw.normalizeRecoveryCode(code));
    expect(pw.verifyPassword(pw.normalizeRecoveryCode(code.toLowerCase().replace(/-/g, ' ')), h)).toBe(true);
    expect(pw.verifyPassword(pw.normalizeRecoveryCode('AAAA-AAAA-AAAA'), h)).toBe(false);
    expect(pw.verifyPassword('x', 'garbage')).toBe(false);
    expect(pw.tempPassword()).toHaveLength(10);
  });
});

describe('message variables', () => {
  const o = { customer_name: 'Sara', products: 'Robe', size: 'M', color: '', price: 199, city: 'Casablanca', address: 'Rue 1', order_number: 'AK-1', quantity: 1 };
  it('fills {shop} and friends; asks for the address when missing', () => {
    const m = tpl.buildMessage(null, 'darija', o, 'Chic Mode');
    expect(m).toContain('Chic Mode'); expect(m).not.toContain('عافاك صيفط');
    expect(tpl.buildMessage(null, 'fr', { ...o, address: '' }, 'Chic Mode')).toContain('adresse complète');
    expect(tpl.buildMessage('{shop}|{order_number}|{size}|{qty}|{address}', 'ar', o, 'S')).toBe('S|AK-1|M|1|Rue 1');
  });
});

describe('Batch B: billing, backup, data rights, settings', () => {
  let billing: any, rights: any, backup: any, settings: any;
  beforeAll(async () => {
    billing = await import('../src/lib/billing'); rights = await import('../src/lib/dataRights');
    backup = await import('../src/lib/backup'); settings = await import('../src/lib/settings');
    db().prepare(`INSERT INTO workspaces (id, name, plan, status, period_end) VALUES (9,'Pay Shop','trial','trial','2020-01-01T00:00:00.000Z')`).run();
    db().prepare(`INSERT INTO users (id, workspace_id, email, password_hash, role) VALUES (90,9,'p@x.com','x:y','owner')`).run();
  });
  it('validates payments and proof files by magic bytes', () => {
    expect(billing.createPayment(9, { plan: 'trial', method: 'bank', reference: 'ABC123' }).error).toBe('plan');
    expect(billing.createPayment(9, { plan: 'pro', method: 'paypal', reference: 'ABC123' }).error).toBe('method');
    expect(billing.createPayment(9, { plan: 'pro', method: 'bank', reference: 'x' }).error).toBe('reference');
    expect(billing.checkProof(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1]))?.mime).toBe('image/jpeg');
    expect(billing.checkProof(new Uint8Array([0x25, 0x50, 0x44, 0x46, 1]))?.mime).toBe('application/pdf');
    expect(billing.checkProof(new TextEncoder().encode('<script>alert(1)</script>'))).toBeNull();
    expect(billing.checkProof(new Uint8Array(2_000_001).fill(0xff))).toBeNull();
  });
  it('approving extends from today when expired, from the old end when still active, and caps pending requests', () => {
    expect(billing.createPayment(9, { plan: 'pro', method: 'cashplus', reference: 'CP-777', proof: billing.checkProof(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0])) }).ok).toBe(true);
    const id = (db().prepare(`SELECT id FROM payments WHERE workspace_id = 9`).get() as any).id;
    const now = new Date('2026-11-03T10:00:00Z');
    expect(billing.decidePayment(id, true, 1, now)).toBe(true);
    const w = db().prepare('SELECT plan, status, period_end FROM workspaces WHERE id = 9').get() as any;
    expect(w).toMatchObject({ plan: 'pro', status: 'active' });
    expect(w.period_end.slice(0, 10)).toBe('2026-12-03');
    expect(billing.decidePayment(id, true, 1, now)).toBe(false); // already decided
    expect(billing.extendedPeriodEnd('2026-11-20T00:00:00.000Z', 'active', now).slice(0, 10)).toBe('2026-12-20');
    expect(billing.extendedPeriodEnd('2026-11-20T00:00:00.000Z', 'suspended', now).slice(0, 10)).toBe('2026-12-03');
    for (let i = 0; i < 3; i++) billing.createPayment(9, { plan: 'starter', method: 'bank', reference: 'REF' + i });
    expect(billing.createPayment(9, { plan: 'starter', method: 'bank', reference: 'REF9' }).error).toBe('pending');
    expect(billing.daysLeft('2026-11-06T10:00:00Z', now)).toBe(3);
  });
  it('exports only the seller\'s own data, erases a customer, deletes a workspace', () => {
    const own = rights.exportWorkspaceData(1);
    expect(own.orders.length).toBeGreaterThan(0);
    expect(own.orders.every((o: any) => o.workspace_id === 1)).toBe(true);
    expect(JSON.stringify(own)).not.toMatch(/password_hash|recovery_hash|wa_token_enc|ameex_api_key/);
    const phone = own.orders[0].phone;
    const r = rights.eraseCustomer(1, phone);
    expect(r.ok && r.orders).toBeGreaterThan(0);
    expect(db().prepare('SELECT COUNT(*) c FROM orders WHERE workspace_id = 1 AND phone = ?').get(phone).c).toBe(0);
    expect(rights.eraseCustomer(1, 'nope').ok).toBe(false);
    rights.deleteWorkspace(9);
    expect(db().prepare('SELECT COUNT(*) c FROM workspaces WHERE id = 9').get().c).toBe(0);
    expect(db().prepare('SELECT COUNT(*) c FROM payments WHERE workspace_id = 9').get().c).toBe(0);
    expect(db().prepare('SELECT COUNT(*) c FROM workspaces WHERE id = 1').get().c).toBe(1); // others untouched
  });
  it('backs up a consistent copy and prunes old ones', async () => {
    const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'akked-bk-'));
    for (let i = 0; i < 17; i++) backup.backupTo(dir, new Date(Date.UTC(2026, 0, 1 + i, 3, 0, 0)));
    const files = fs.readdirSync(dir); expect(files).toHaveLength(14);
    const sqlite = (process as any).getBuiltinModule('node:sqlite');
    const copy = new sqlite.DatabaseSync(path.join(dir, files.sort().pop()!));
    expect((copy.prepare('SELECT COUNT(*) c FROM workspaces').get() as any).c).toBe(2);
  });
  it('stores platform settings', () => {
    expect(settings.getSetting('support_whatsapp', 'none')).toBe('none');
    settings.setSetting('support_whatsapp', '+212600000000'); settings.setSetting('support_whatsapp', '+212611111111');
    expect(settings.getSetting('support_whatsapp')).toBe('+212611111111');
  });
});

describe('searching orders by phone', () => {
  it('finds +212 numbers however the user types them, and still searches names', () => {
    const d = db(); d.prepare(`INSERT INTO workspaces (id, name, plan, status, period_end) VALUES (7,'Q','pro','active','2099-01-01')`).run();
    d.prepare(`INSERT INTO orders (workspace_id, order_number, customer_name, phone, status) VALUES (7,'Q1','Sara 0600','+212655443322','new'),(7,'Q2','Hind','+212700112233','new')`).run();
    const n = (q: string) => orders.listOrders(7, { q }).map((o: any) => o.order_number);
    for (const q of ['0655443322', '06 55 44 33 22', '+212655443322', '00212655443322', '212655443322', '655443322', '0655443', '55 44 33']) expect([q, n(q)]).toEqual([q, ['Q1']]);
    expect(n('Hind')).toEqual(['Q2']); expect(n('sara')).toEqual(['Q1']); expect(n('0600')).toEqual(['Q1']); // a name containing digits still matches as text
    expect(n('0799999999')).toEqual([]);
    expect(orders.listOrders(1, { q: '0655443322' })).toHaveLength(0); // other sellers' orders are never searched
  });
});
