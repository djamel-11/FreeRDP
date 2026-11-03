import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const g = globalThis as unknown as { __akkedDb?: Database.Database };

export function db(): Database.Database {
  if (g.__akkedDb) return g.__akkedDb;
  const file = process.env.AKKED_DB || path.join(process.cwd(), 'data', 'akked.db');
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const d = new Database(file);
  d.pragma('journal_mode = WAL');
  d.pragma('foreign_keys = ON');
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
  d.exec(`CREATE TABLE IF NOT EXISTS ameex_cities (canonical TEXT PRIMARY KEY, ameex_id INTEGER NOT NULL)`);
  g.__akkedDb = d;
  return d;
}

/** Test helper: reset the cached connection. */
export function __resetDb() { g.__akkedDb?.close(); g.__akkedDb = undefined; }
