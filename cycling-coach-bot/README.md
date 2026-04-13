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
- 🎙 Voice message support (Telegram audio → OpenAI Whisper → coaching).
- 🚨 Optional proactive monitoring (WHOOP red streaks, deep TSB).
- 💸 Prompt caching on the coaching system prompt (cuts Claude input cost by ~90%).
- 🛡 Per-user in-memory rate limiting.
- 🛠 Commands: `/start`, `/status`, `/analyze <id>`, `/plan`, `/compare`,
  `/monitor on|off`, `/disconnect <provider>`, `/seedtoken` (admin).

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

Set `OAUTH_CALLBACK_PORT` and the bot boots a small HTTP server alongside the
Telegram long-polling loop. It handles:

- `GET /oauth/strava/callback?code=…&state=tg:<telegram_id>`
- `GET /oauth/trainingpeaks/callback?…`
- `GET /oauth/whoop/callback?…`

Point your provider redirect URIs at `https://<your-host>/oauth/<provider>/callback`
and the server exchanges the code for tokens, persists them via `saveToken()`,
and shows a small "Connected ✅ — back to Telegram" page.

### Voice messages

Send a Telegram voice note (or an audio file) and the bot will:

1. Download the OGG/Opus file from the Telegram Bot API.
2. Transcribe it with OpenAI Whisper (`whisper-1` by default).
3. Echo what it heard back to you, then run the transcription through the
   same Claude coaching pipeline as a text message.

Requires `OPENAI_API_KEY`. Set `WHISPER_LANGUAGE` (e.g. `cs`, `en`) to force a
specific language; otherwise Whisper auto-detects.

### Inline quick actions

The `/start` reply and every coaching answer ship with an inline keyboard:

```
[ 📊 Status ] [ 🗓 Plan ]
[ ✅ Should I train? ] [ 💀 Rest day? ]
```

### Deployment

- **Docker** — `Dockerfile` is included; mount a volume at `/data` to persist
  the SQLite DB across deploys.
- **Fly.io** — `fly.toml` declares a 256 MB shared VM, a `coach_data` volume
  mounted at `/data`, and exposes port 3000 for OAuth callbacks.
  `fly launch --copy-config && fly secrets set …`.
- **Railway** — `railway.json` points at the Dockerfile; set env vars in
  the dashboard, attach a volume at `/data`.

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

## Webhooks vs long polling

The bot uses long polling by default (`bot.launch()`). For webhook-based
deployment, swap to `bot.launch({ webhook: { domain, hookPath, port } })`
and terminate TLS at your load balancer or reverse proxy.
