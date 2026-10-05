export type NodeEnv = 'development' | 'test' | 'production';

export interface Config {
  nodeEnv: NodeEnv;
  telegramBotToken: string;
  /** Optional in Phase 1: Gemini is not connected yet. */
  geminiApiKey: string | undefined;
  databasePath: string;
}

export class ConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid configuration:\n- ${problems.join('\n- ')}`);
    this.name = 'ConfigError';
  }
}

const NODE_ENVS: readonly string[] = ['development', 'test', 'production'];
// Telegram tokens look like "123456789:AA...". Error messages never echo the value.
const TOKEN_PATTERN = /^\d{5,}:[A-Za-z0-9_-]{20,}$/;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const problems: string[] = [];

  const nodeEnv = clean(env['NODE_ENV']) ?? 'development';
  if (!NODE_ENVS.includes(nodeEnv)) {
    problems.push(`NODE_ENV must be one of: ${NODE_ENVS.join(', ')}`);
  }

  const token = clean(env['TELEGRAM_BOT_TOKEN']);
  if (!token) {
    problems.push('TELEGRAM_BOT_TOKEN is required');
  } else if (!TOKEN_PATTERN.test(token)) {
    problems.push('TELEGRAM_BOT_TOKEN has an invalid format');
  }

  const databasePath = clean(env['DATABASE_PATH']) ?? './data/lina.db';

  if (problems.length > 0 || !token) throw new ConfigError(problems);

  return {
    nodeEnv: nodeEnv as NodeEnv,
    telegramBotToken: token,
    geminiApiKey: clean(env['GEMINI_API_KEY']),
    databasePath,
  };
}

/** Safe-to-log view of the config: secrets are replaced by presence flags. */
export function describeConfig(config: Config): Record<string, unknown> {
  return {
    nodeEnv: config.nodeEnv,
    databasePath: config.databasePath,
    telegramBotToken: '[set]',
    geminiApiKey: config.geminiApiKey ? '[set]' : '[not set]',
  };
}
