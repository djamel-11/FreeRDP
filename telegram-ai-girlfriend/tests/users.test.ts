import { describe, expect, it } from 'vitest';
import { makeApp } from './helpers.js';

describe('user creation, 18+ and language', () => {
  it('creates a user once and updates the profile', () => {
    const { users, repos } = makeApp();
    const a = users.registerUser({ telegramId: 42, username: 'a', firstName: 'Ann' });
    const b = users.registerUser({ telegramId: 42, username: 'b', firstName: 'Ann' });
    expect(b.id).toBe(a.id);
    expect(a.ageStatus).toBe('unknown');
    expect(repos.users.findByTelegramId(42)?.username).toBe('b');
    expect(repos.credits.getOrCreate(a.id).balance).toBe(0);
  });

  it('rejects invalid Telegram ids', () => {
    const { users } = makeApp();
    expect(() => users.registerUser({ telegramId: -1 })).toThrow();
    expect(() => users.registerUser({ telegramId: 1.5 })).toThrow();
  });

  it('confirms 18+', () => {
    const { users } = makeApp();
    const u = users.registerUser({ telegramId: 1 });
    expect(users.confirmAdult(u.id)).toBe(true);
    const state = users.getState(1);
    expect(state?.user.ageStatus).toBe('confirmed');
    expect(state?.user.ageConfirmedAt).not.toBeNull();
  });

  it('blocks under-18 users permanently', () => {
    const { users } = makeApp();
    const u = users.registerUser({ telegramId: 2 });
    users.denyAge(u.id);
    expect(users.confirmAdult(u.id)).toBe(false);
    expect(users.setLanguage(u.id, 'en')).toBe(false);
    expect(users.canAccessChat(2)).toBe(false);
  });

  it('requires 18+ before language selection and saves the language', () => {
    const { users } = makeApp();
    const u = users.registerUser({ telegramId: 3 });
    expect(users.setLanguage(u.id, 'fr')).toBe(false);
    users.confirmAdult(u.id);
    expect(users.canAccessChat(3)).toBe(false);
    expect(users.setLanguage(u.id, 'ar')).toBe(true);
    expect(users.getState(3)?.language).toBe('ar');
    expect(users.setLanguage(u.id, 'es')).toBe(true);
    expect(users.getState(3)?.language).toBe('es');
    expect(users.canAccessChat(3)).toBe(true);
  });

  it('rejects unsupported languages', () => {
    const { users } = makeApp();
    const u = users.registerUser({ telegramId: 4 });
    users.confirmAdult(u.id);
    expect(() => users.setLanguage(u.id, 'de')).toThrow();
  });
});
