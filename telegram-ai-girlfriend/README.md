# AI Girlfriend Telegram Bot — "Lina"

A Telegram AI companion for adults (18+). Lina is a fictional AI character: romantic, caring, playful and mildly flirty, but **not** designed for explicit sexual content. Supports English, French, Spanish and Arabic from a single personality definition (no per-language models).

> **Status: Phase 1 — project foundation only.** There is no AI chat yet and no Gemini connection.

## Requirements

Node.js >= 20 (developed on 22) and npm.

## Setup

```bash
npm install
cp .env.example .env     # then fill in TELEGRAM_BOT_TOKEN
npm run dev              # watch mode
```

| Variable             | Required | Notes                                         |
| -------------------- | -------- | --------------------------------------------- |
| `TELEGRAM_BOT_TOKEN` | yes      | From @BotFather. Never commit it.             |
| `GEMINI_API_KEY`     | no       | Unused in Phase 1.                            |
| `DATABASE_PATH`      | no       | Default `./data/lina.db`.                     |
| `NODE_ENV`           | no       | `development` (default), `test`, `production` |

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run typecheck` · `npm run lint` · `npm test`

## Architecture

```
src/
  config/       env loading + validation (secrets never logged)
  database/     SQLite connection, schema/migrations, repositories
  services/     application logic (users, 18+ gate, language)
  memory/       memory CRUD service (no smart memory yet)
  credits/      credits foundation (balance read only)
  ai/           AIProvider interface + MockAIProvider (no real providers)
  personality/  Lina definition + system prompt builder
  bot/          grammY handlers, keyboards, localized strings (ONLY Telegram code)
  types/ utils/ shared types, logger
tests/          vitest
```

Rules: Telegram code stays in `bot/`, AI code in `ai/`, SQL only in `database/`. The bot never depends on an AI provider.

## Phase 1 behaviour

- `/start` → welcome, AI-companion disclosure, 18+ notice, inline buttons (✅ 18+ / ❌ under 18).
- Under 18 → access blocked. This is **permanent** for that account (it cannot be flipped by pressing the other button later).
- 18+ → language picker (🇬🇧 🇫🇷 🇪🇸 🇸🇦), saved per user; onboarding strings are localized.
- Afterwards the bot only replies that chat is not available yet.

## Not implemented yet

Gemini/real conversations, conversation history use, smart memory, credits logic, payments (Telegram Stars), multiple personalities, rate limiting/abuse protection, deployment, admin/analytics.
