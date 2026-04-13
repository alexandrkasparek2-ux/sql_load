# Cycling Coach Telegram Bot

Telegram bot acting as an elite cycling performance coach. It pulls training
data from **Strava**, **TrainingPeaks**, **WHOOP** and the custom SQL dashboard
at <https://sql-load-xnhd.vercel.app>, and turns it into actionable coaching
through **Claude Sonnet 4.5**.

## Features

- 🤖 Conversational coaching via Telegram.
- 🔐 OAuth2 for Strava / TrainingPeaks / WHOOP with automatic refresh.
- 📊 Data aggregation from 4 independent sources with graceful degradation.
- 🧠 Claude Sonnet 4.5 with a structured coaching prompt (`summary / analysis /
  recommendation / question`).
- 🗄 SQLite persistence for users, tokens and conversations.
- 🚨 Optional proactive monitoring (WHOOP red streaks, deep TSB).
- 🛠 Commands: `/start`, `/status`, `/analyze <id>`, `/plan`, `/compare`,
  `/monitor on|off`.

## Tech stack

| Layer      | Tool                                             |
| ---------- | ------------------------------------------------ |
| Runtime    | Node.js 20+ / TypeScript                         |
| Bot        | [Telegraf](https://telegraf.js.org)              |
| LLM        | Anthropic Claude (`claude-sonnet-4-5`)           |
| Database   | SQLite via `better-sqlite3`                      |
| Deploy     | Railway / Fly.io / Vercel (long-running worker)  |

## Project structure

```
cycling-coach-bot/
├── src/
│   ├── bot.ts                 # Telegram bot entry point
│   ├── data/
│   │   ├── strava.ts
│   │   ├── trainingpeaks.ts
│   │   ├── whoop.ts
│   │   └── custom.ts
│   ├── prompts/
│   │   └── coach.ts           # Claude system prompt
│   ├── utils/
│   │   ├── aggregateData.ts
│   │   ├── claude.ts
│   │   ├── auth.ts
│   │   ├── monitor.ts
│   │   └── retry.ts
│   ├── db/
│   │   └── schema.ts
│   └── types/
│       └── index.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Quick start

```bash
cd cycling-coach-bot
cp .env.example .env     # fill in tokens / secrets
npm install
npm run dev              # or: npm run build && npm start
```

Talk to [@BotFather](https://t.me/BotFather) to create a bot and obtain a
`TELEGRAM_BOT_TOKEN`.

### Environment variables

See `.env.example`. The most important ones:

- `TELEGRAM_BOT_TOKEN` – from BotFather.
- `ANTHROPIC_API_KEY` – Claude API key (uses `claude-sonnet-4-5` by default).
- `STRAVA_*`, `WHOOP_*`, `TP_*` – OAuth app credentials.
- `CUSTOM_DASHBOARD_URL` – defaults to the provided SQL dashboard.
- `DATABASE_URL` – SQLite path (e.g. `./data/coach.sqlite`).

### OAuth callbacks

Each provider needs a callback URL that exchanges `code` for tokens and stores
them via `saveToken()` in `src/db/schema.ts`. The simplest way is to host a
tiny Express/Vercel function alongside the bot; the state parameter carries
the Telegram user id (`tg:<id>`) emitted by `buildAuthUrls()`.

## MVP priorities

1. ✅ Telegram bot basics (send / receive).
2. ✅ Strava integration.
3. ✅ Claude coaching call with structured prompt.
4. ✅ SQLite persistence.
5. ⏸ TrainingPeaks / WHOOP OAuth (scaffolding included, needs app credentials).
6. ⏸ Proactive monitoring (flag-gated via `ENABLE_PROACTIVE_MONITORING`).

## Example conversation

```
user: Should I do 4x8min threshold today?
bot:  WHOOP recovery 42% and TSB -34 suggest you're overreaching.

      📊 Analysis
      • WHOOP recovery 42% — below 50% caution threshold
      • TSB -34 — beyond the -30 overreaching guardrail
      • Sleep performance 71% yesterday — impaired recovery
      • 7-day TSS trending sharply up (+22%)

      ✅ Recommendation
      No. Skip the intervals today. Replace with Z1 spin 45–60 min
      or full rest. Re-evaluate tomorrow once recovery is >60%.

      ❓ Was last night's sleep disrupted by anything in particular?
```

## Error handling

- Each data source degrades independently — a WHOOP outage does not block
  Strava-based answers.
- Exponential backoff on Strava / TP / WHOOP / Claude.
- User-visible error messages are short and actionable.

## Deployment

Any long-running Node host works (Railway, Fly.io, a Vercel Background
Worker). The worker must hold an open long-poll connection; if you prefer
webhooks, swap `bot.launch()` for `bot.launch({ webhook: { ... } })`.
