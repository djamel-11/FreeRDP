import { describe, expect, it } from 'vitest';
import { MemoryService } from '../src/memory/memory-service.js';
import { makeApp } from './helpers.js';

function setup() {
  const { users, repos } = makeApp();
  const service = new MemoryService(repos.memories);
  const a = users.registerUser({ telegramId: 10 });
  const b = users.registerUser({ telegramId: 11 });
  return { service, a, b };
}

describe('memory service', () => {
  it('adds, lists, updates and removes', () => {
    const { service, a } = setup();
    const m = service.add(a.id, '  Likes tea ', 'preferences');
    expect(m.content).toBe('Likes tea');
    expect(service.list(a.id)).toHaveLength(1);
    expect(service.update(a.id, m.id, 'Likes coffee')).toBe(true);
    expect(service.get(a.id, m.id)?.content).toBe('Likes coffee');
    expect(service.remove(a.id, m.id)).toBe(true);
    expect(service.list(a.id)).toHaveLength(0);
  });

  it('isolates memories between users', () => {
    const { service, a, b } = setup();
    const m = service.add(a.id, 'secret');
    expect(service.get(b.id, m.id)).toBeUndefined();
    expect(service.remove(b.id, m.id)).toBe(false);
    expect(service.list(b.id)).toEqual([]);
  });

  it('validates content and clears all', () => {
    const { service, a } = setup();
    expect(() => service.add(a.id, '   ')).toThrow();
    expect(() => service.add(a.id, 'x'.repeat(501))).toThrow();
    service.add(a.id, 'one');
    service.add(a.id, 'two');
    expect(service.clear(a.id)).toBe(2);
  });
});
