import { describe, expect, it } from 'vitest';
import { ConfigError, describeConfig, loadConfig } from '../src/config/index.js';

const TOKEN = '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_0123456789';

describe('config', () => {
  it('loads valid config with defaults', () => {
    const c = loadConfig({ TELEGRAM_BOT_TOKEN: TOKEN });
    expect(c.nodeEnv).toBe('development');
    expect(c.databasePath).toBe('./data/lina.db');
    expect(c.geminiApiKey).toBeUndefined();
  });

  it('requires the Telegram token', () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    expect(() => loadConfig({ TELEGRAM_BOT_TOKEN: '  ' })).toThrow(/TELEGRAM_BOT_TOKEN is required/);
  });

  it('rejects malformed tokens without echoing them', () => {
    const bad = 'not-a-token-secret';
    try {
      loadConfig({ TELEGRAM_BOT_TOKEN: bad });
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/invalid format/);
      expect((e as Error).message).not.toContain(bad);
    }
  });

  it('rejects invalid NODE_ENV', () => {
    expect(() => loadConfig({ TELEGRAM_BOT_TOKEN: TOKEN, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('does not expose secrets when described', () => {
    const c = loadConfig({ TELEGRAM_BOT_TOKEN: TOKEN, GEMINI_API_KEY: 'gem-secret-key' });
    const text = JSON.stringify(describeConfig(c));
    expect(text).not.toContain(TOKEN);
    expect(text).not.toContain('gem-secret-key');
  });
});
