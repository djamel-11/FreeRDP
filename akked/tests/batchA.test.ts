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
