import { Bot, InlineKeyboard, type Context } from 'grammy';
import type { UserService } from '../services/user-service.js';
import { isLanguage } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { LANGUAGE_BUTTONS, t } from './messages.js';

export const CALLBACK = {
  ageYes: 'age:yes',
  ageNo: 'age:no',
  langPrefix: 'lang:',
} as const;

export interface BotDeps {
  users: UserService;
}

function ageKeyboard(): InlineKeyboard {
  const s = t(null);
  return new InlineKeyboard().text(s.ageYes, CALLBACK.ageYes).text(s.ageNo, CALLBACK.ageNo);
}

function languageKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  LANGUAGE_BUTTONS.forEach((b, i) => {
    kb.text(b.label, `${CALLBACK.langPrefix}${b.code}`);
    if (i % 2 === 1) kb.row();
  });
  return kb;
}

/** Strips the inline keyboard from the message a button was pressed on (best effort). */
async function clearButtons(ctx: Context): Promise<void> {
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
  } catch {
    /* message may be too old or already edited */
  }
}

export function createBot(token: string, { users }: BotDeps): Bot {
  const bot = new Bot(token);

  // Phase 1 is private-chat only.
  bot.use(async (ctx, next) => {
    if (ctx.chat?.type === 'private') await next();
  });

  bot.command('start', async (ctx) => {
    const from = ctx.from;
    if (!from) return;
    const user = users.registerUser({ telegramId: from.id, username: from.username, firstName: from.first_name });
    const state = users.getState(from.id);
    const language = state?.language ?? null;

    if (user.ageStatus === 'denied') {
      await ctx.reply(t(language).underAge);
    } else if (user.ageStatus === 'unknown') {
      const s = t(null);
      await ctx.reply(`${s.welcome}\n\n${s.agePrompt}`, { reply_markup: ageKeyboard() });
    } else if (!language) {
      await ctx.reply(t(null).chooseLanguage, { reply_markup: languageKeyboard() });
    } else {
      await ctx.reply(t(language).welcomeBack);
    }
  });

  bot.callbackQuery([CALLBACK.ageYes, CALLBACK.ageNo], async (ctx) => {
    const from = ctx.from;
    const user = users.registerUser({ telegramId: from.id, username: from.username, firstName: from.first_name });
    await ctx.answerCallbackQuery();
    await clearButtons(ctx);

    if (ctx.callbackQuery.data === CALLBACK.ageNo) {
      users.denyAge(user.id);
      await ctx.reply(t(null).underAge);
      return;
    }
    if (!users.confirmAdult(user.id)) {
      await ctx.reply(t(null).underAge);
      return;
    }
    await ctx.reply(t(null).chooseLanguage, { reply_markup: languageKeyboard() });
  });

  bot.callbackQuery(new RegExp(`^${CALLBACK.langPrefix}`), async (ctx) => {
    const code = ctx.callbackQuery.data.slice(CALLBACK.langPrefix.length);
    await ctx.answerCallbackQuery();
    const state = users.getState(ctx.from.id);
    if (!state || !isLanguage(code) || !users.setLanguage(state.user.id, code)) {
      await ctx.reply(t(null).needStart);
      return;
    }
    await clearButtons(ctx);
    await ctx.reply(t(code).languageSaved);
  });

  // Phase 1: no AI chat yet. Only gate access and acknowledge.
  bot.on('message:text', async (ctx) => {
    const state = users.getState(ctx.from.id);
    if (!state || state.user.ageStatus === 'unknown') {
      await ctx.reply(t(null).needStart);
    } else if (state.user.ageStatus === 'denied') {
      await ctx.reply(t(state.language).underAge);
    } else if (!state.language) {
      await ctx.reply(t(null).chooseLanguage, { reply_markup: languageKeyboard() });
    } else {
      await ctx.reply(t(state.language).chatSoon);
    }
  });

  bot.catch((err) => {
    logger.error('Bot error:', err.error);
  });

  return bot;
}
