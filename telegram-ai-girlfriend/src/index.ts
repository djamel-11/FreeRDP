import { existsSync } from 'node:fs';
import { createBot } from './bot/index.js';
import { ConfigError, describeConfig, loadConfig } from './config/index.js';
import { createRepositories, openDatabase } from './database/index.js';
import { UserService } from './services/user-service.js';
import { logger, registerSecret } from './utils/logger.js';

async function main(): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env');

  const config = loadConfig();
  registerSecret(config.telegramBotToken);
  registerSecret(config.geminiApiKey);
  logger.info('Starting Lina bot', describeConfig(config));

  const db = openDatabase(config.databasePath);
  const users = new UserService(createRepositories(db));
  const bot = createBot(config.telegramBotToken, { users });

  const shutdown = (): void => {
    logger.info('Shutting down');
    void bot.stop().finally(() => {
      db.close();
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await bot.start({ onStart: (me) => logger.info(`Bot @${me.username} is running`) });
}

main().catch((err: unknown) => {
  if (err instanceof ConfigError) {
    logger.error(err.message);
  } else {
    logger.error('Fatal error:', err);
  }
  process.exit(1);
});
