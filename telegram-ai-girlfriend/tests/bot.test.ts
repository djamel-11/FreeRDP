import { describe, expect, it } from 'vitest';
import type { Bot } from 'grammy';
import { createBot } from '../src/bot/index.js';
import { makeApp } from './helpers.js';

const TOKEN = '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_0123456789';

function setup() {
  const { users } = makeApp();
  const bot: Bot = createBot(TOKEN, { users });
  bot.botInfo = {
    id: 1, is_bot: true, first_name: 'Lina', username: 'lina_bot', can_join_groups: false,
    can_read_all_group_messages: false, supports_inline_queries: false, can_connect_to_business: false,
    has_main_web_app: false, can_manage_bots: false, supports_join_request_queries: false, has_topics_enabled: false, allows_users_to_create_topics: false,
  };
  const sent: { method: string; payload: Record<string, unknown> }[] = [];
  bot.api.config.use(async (_prev, method, payload) => {
    sent.push({ method, payload: payload as Record<string, unknown> });
    return { ok: true, result: true } as never;
  });
  return { bot, users, sent };
}

const chat = { id: 5, type: 'private' as const, first_name: 'T' };
const from = { id: 5, is_bot: false, first_name: 'T' };
let n = 0;

const text = (t: string, extra = {}) => ({
  update_id: ++n,
  message: { message_id: n, date: 0, chat, from, text: t, ...extra },
});
const press = (data: string) => ({
  update_id: ++n,
  callback_query: {
    id: String(n), from, chat_instance: 'c', data,
    message: { message_id: n, date: 0, chat, text: 'x' },
  },
});

describe('bot onboarding flow', () => {
  it('/start shows welcome, AI disclosure, 18+ notice and buttons', async () => {
    const { bot, sent } = setup();
    await bot.handleUpdate(text('/start', { entities: [{ type: 'bot_command', offset: 0, length: 6 }] }));
    const reply = sent.find((s) => s.method === 'sendMessage');
    expect(String(reply?.payload['text'])).toMatch(/AI companion/);
    expect(String(reply?.payload['text'])).toMatch(/18/);
    expect(JSON.stringify(reply?.payload['reply_markup'])).toContain('age:yes');
    expect(JSON.stringify(reply?.payload['reply_markup'])).toContain('age:no');
  });

  it('18+ leads to language choice, then saves language', async () => {
    const { bot, users, sent } = setup();
    await bot.handleUpdate(text('/start', { entities: [{ type: 'bot_command', offset: 0, length: 6 }] }));
    await bot.handleUpdate(press('age:yes'));
    const langMsg = sent.filter((s) => s.method === 'sendMessage').at(-1);
    expect(JSON.stringify(langMsg?.payload['reply_markup'])).toContain('lang:ar');
    await bot.handleUpdate(press('lang:fr'));
    expect(users.getState(5)?.language).toBe('fr');
    expect(users.canAccessChat(5)).toBe(true);
  });

  it('under-18 is blocked and cannot continue', async () => {
    const { bot, users, sent } = setup();
    await bot.handleUpdate(text('/start', { entities: [{ type: 'bot_command', offset: 0, length: 6 }] }));
    await bot.handleUpdate(press('age:no'));
    await bot.handleUpdate(press('age:yes'));
    await bot.handleUpdate(press('lang:en'));
    expect(users.getState(5)?.user.ageStatus).toBe('denied');
    expect(users.canAccessChat(5)).toBe(false);
    expect(users.getState(5)?.language).toBeNull();
    expect(sent.some((s) => String(s.payload['text'] ?? '').includes('Language saved'))).toBe(false);
  });

  it('language buttons are ignored before age confirmation', async () => {
    const { bot, users } = setup();
    await bot.handleUpdate(text('/start', { entities: [{ type: 'bot_command', offset: 0, length: 6 }] }));
    await bot.handleUpdate(press('lang:en'));
    expect(users.getState(5)?.language).toBeNull();
  });
});
