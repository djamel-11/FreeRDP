import fs from 'node:fs';
import path from 'node:path';

/** Thin wrapper over Node's built-in SQLite (node:sqlite, Node >= 22.13) — no native build step needed. */
export interface Stmt { run(...a: any[]): { changes: number | bigint; lastInsertRowid: number | bigint }; get(...a: any[]): any; all(...a: any[]): any[] }
export interface Db { prepare(sql: string): Stmt; exec(sql: string): void; transaction<T>(fn: () => T): () => T; close(): void }

const g = globalThis as unknown as { __akkedDb?: Db };

function open(file: string): Db {
  const sqlite = (process as any).getBuiltinModule?.('node:sqlite');
  if (!sqlite) throw new Error('This app needs Node.js 22.13 or newer (built-in SQLite). Please install the current LTS from nodejs.org.');
  const raw = new sqlite.DatabaseSync(file);
  return {
    prepare: (sql) => raw.prepare(sql),
    exec: (sql) => raw.exec(sql),
    close: () => raw.close(),
    transaction: (fn) => () => {
      raw.exec('BEGIN');
      try { const r = fn(); raw.exec('COMMIT'); return r; } catch (e) { raw.exec('ROLLBACK'); throw e; }
    },
  };
}

export function db(): Db {
  if (g.__akkedDb) return g.__akkedDb;
  const file = process.env.AKKED_DB || path.join(process.cwd(), 'data', 'akked.db');
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const d = open(file);
  d.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  d.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'trial',
    status TEXT NOT NULL DEFAULT 'trial', period_end TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    template_darija TEXT, template_ar TEXT, template_fr TEXT
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, workspace_id INTEGER REFERENCES workspaces(id), email TEXT UNIQUE NOT NULL,
    full_name TEXT, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'owner', is_admin INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY, workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
    order_number TEXT, customer_name TEXT NOT NULL, phone TEXT NOT NULL, city TEXT, address TEXT,
    products TEXT, size TEXT, color TEXT, quantity INTEGER DEFAULT 1, price REAL DEFAULT 0, notes TEXT,
    status TEXT NOT NULL DEFAULT 'new', callback_at TEXT, agent_id INTEGER REFERENCES users(id),
    source TEXT DEFAULT 'manual', created_at TEXT DEFAULT CURRENT_TIMESTAMP, status_changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    exported_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_orders_ws_phone ON orders(workspace_id, phone);
  CREATE INDEX IF NOT EXISTS idx_orders_ws_status ON orders(workspace_id, status);
  CREATE TABLE IF NOT EXISTS order_events (
    id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), user_id INTEGER,
    from_status TEXT, to_status TEXT, note TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `);
  const cols = (tbl: string) => (d.prepare(`PRAGMA table_info(${tbl})`).all() as any[]).map((c) => c.name);
  const addCol = (tbl: string, col: string, def: string) => { if (!cols(tbl).includes(col)) d.exec(`ALTER TABLE ${tbl} ADD COLUMN ${col} ${def}`); };
  addCol('workspaces', 'ameex_api_id', 'TEXT');
  addCol('workspaces', 'ameex_api_key_enc', 'TEXT');
  addCol('orders', 'ameex_parcel_code', 'TEXT');
  addCol('orders', 'ameex_error', 'TEXT');
  d.exec(`CREATE TABLE IF NOT EXISTS platform_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY, workspace_id INTEGER NOT NULL REFERENCES workspaces(id), plan TEXT NOT NULL, amount REAL NOT NULL,
    method TEXT NOT NULL, reference TEXT NOT NULL, note TEXT, proof BLOB, proof_mime TEXT,
    status TEXT NOT NULL DEFAULT 'pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP, decided_at TEXT, decided_by INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_payments_ws ON payments(workspace_id, id);`);
  d.exec(`CREATE TABLE IF NOT EXISTS import_jobs (id INTEGER PRIMARY KEY, workspace_id INTEGER NOT NULL, filename TEXT, bytes BLOB NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  addCol('orders', 'cancel_reason', 'TEXT');
  addCol('orders', 'carrier_status', 'TEXT');
  addCol('orders', 'carrier_checked_at', 'TEXT');
  addCol('orders', 'carrier_id', 'INTEGER');
  d.exec(`CREATE TABLE IF NOT EXISTS carriers (
    id INTEGER PRIMARY KEY, workspace_id INTEGER NOT NULL REFERENCES workspaces(id), name TEXT NOT NULL, connector TEXT, creds_enc TEXT,
    config TEXT NOT NULL DEFAULT '{}', template BLOB, template_name TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_carriers_ws ON carriers(workspace_id);
  CREATE TABLE IF NOT EXISTS carrier_cities (
    carrier_id INTEGER NOT NULL REFERENCES carriers(id) ON DELETE CASCADE, canonical TEXT NOT NULL, carrier_city_id TEXT, carrier_city_name TEXT,
    PRIMARY KEY (carrier_id, canonical)
  );`);
  addCol('workspaces', 'sheet_url', 'TEXT');
  addCol('workspaces', 'sheet_last_sync', 'TEXT');
  addCol('workspaces', 'sheet_last_result', 'TEXT');
  d.exec(`CREATE TABLE IF NOT EXISTS sheet_seen (workspace_id INTEGER NOT NULL, h TEXT NOT NULL, PRIMARY KEY (workspace_id, h))`);
  addCol('users', 'recovery_hash', 'TEXT');
  addCol('orders', 'claimed_by', 'INTEGER');
  addCol('orders', 'claimed_at', 'TEXT');
  d.exec(`CREATE TABLE IF NOT EXISTS login_fails (key TEXT PRIMARY KEY, n INTEGER NOT NULL, first_at INTEGER NOT NULL)`);
  addCol('workspaces', 'wa_phone_number_id', 'TEXT');
  addCol('workspaces', 'wa_token_enc', 'TEXT');
  addCol('workspaces', 'wa_template_name', 'TEXT');
  addCol('workspaces', 'wa_template_lang', 'TEXT');
  d.exec(`CREATE TABLE IF NOT EXISTS wa_messages (
    id INTEGER PRIMARY KEY, workspace_id INTEGER NOT NULL REFERENCES workspaces(id), wa_id TEXT, phone TEXT NOT NULL,
    direction TEXT NOT NULL, type TEXT, body TEXT, status TEXT, order_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_msg_uid ON wa_messages(workspace_id, wa_id);
  CREATE INDEX IF NOT EXISTS idx_wa_msg_phone ON wa_messages(workspace_id, phone, id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_pnid ON workspaces(wa_phone_number_id) WHERE wa_phone_number_id IS NOT NULL;`);
  d.exec(`CREATE TABLE IF NOT EXISTS ameex_cities (canonical TEXT PRIMARY KEY, ameex_id INTEGER NOT NULL)`);
  const renames: [string, string][] = [['ameex_parcel_code', 'parcel_code'], ['ameex_error', 'carrier_error']];
  for (const [from, to] of renames) { const c = cols('orders'); if (c.includes(from) && !c.includes(to)) d.exec(`ALTER TABLE orders RENAME COLUMN ${from} TO ${to}`); else if (!c.includes(to)) addCol('orders', to, 'TEXT'); }
  const c2 = cols('orders'); if (c2.includes('ameex_status') && !c2.includes('carrier_status')) d.exec('ALTER TABLE orders RENAME COLUMN ameex_status TO carrier_status');
  g.__akkedDb = d;
  return d;
}

/** Test helper: reset the cached connection. */
export function __resetDb() { g.__akkedDb?.close(); g.__akkedDb = undefined; }
