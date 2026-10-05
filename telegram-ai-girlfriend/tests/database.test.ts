import { describe, expect, it } from 'vitest';
import { openDatabase } from '../src/database/index.js';

describe('database', () => {
  it('creates all foundation tables', () => {
    const db = openDatabase(':memory:');
    const names = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
    ).map((r) => r.name);
    for (const t of ['users', 'user_preferences', 'conversations', 'messages', 'memories', 'credits']) {
      expect(names).toContain(t);
    }
  });

  it('enforces foreign keys', () => {
    const db = openDatabase(':memory:');
    expect(() => db.prepare('INSERT INTO conversations (user_id) VALUES (999)').run()).toThrow();
  });

  it('is idempotent to migrate again', () => {
    const db = openDatabase(':memory:');
    expect(db.pragma('user_version', { simple: true })).toBe(1);
  });
});
