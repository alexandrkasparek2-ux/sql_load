import 'dotenv/config';
import { Markup, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import {
  appendMessage,
  deleteToken,
  getProfile,
  getRecentMessages,
  saveToken,
  setMonitoring,
  setProfile,
  upsertUser,
  getToken,
} from './db/schema.js';
import { formatProfile, parseProfileArgs } from './utils/profileArgs.js';
import { checkRateLimit } from './utils/rateLimit.js';
import { isUserBusy, withUserLock } from './utils/sessionLock.js';
import { logger } from './utils/logger.js';
import { maybeSummarize } from './utils/summarize.js';
import type { Provider } from './types/index.js';
import { buildAuthUrls } from './utils/auth.js';
import { fetchAllData } from './utils/aggregateData.js';
import {
  formatForTelegram,
  getCoachingResponse,
  parseCoachResponse,
} from './utils/claude.js';
import { startMonitoring } from './utils/monitor.js';
import { startOAuthCallbackServer } from './utils/oauthCallback.js';
import { transcribeVoice } from './utils/transcribe.js';
import { getActivityById } from './data/strava.js';
import { detectIntervals, getActivityStreams } from './data/streams.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN');
}

export const bot = new Telegraf(BOT_TOKEN);

function now(): number {
  return Math.floor(Date.now() / 1000);
}

function connectionStatus(userId: number): string {
  const providers = ['strava', 'trainingpeaks', 'whoop'] as const;
  return providers
    .map((p) => `${getToken(userId, p) ? '✅' : '⬜️'} ${p}`)
    .join('   ');
}

const quickActionsKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('📊 Status', 'qa:status'),
    Markup.button.callback('🗓 Plan', 'qa:plan'),
  ],
  [
    Markup.button.callback('✅ Should I train?', 'qa:ready'),
    Markup.button.callback('💀 Rest day?', 'qa:rest'),
  ],
]);

bot.start(async (ctx) => {
  const tgId = ctx.from.id;
  const user = upsertUser(tgId);
  const urls = buildAuthUrls(tgId);

  await ctx.reply(
    [
      `👋 Welcome to your cycling coach, ${ctx.from.first_name ?? 'athlete'}.`,
      '',
      'Connect your accounts to get personalised coaching:',
      `• Strava: ${urls.strava}`,
      `• TrainingPeaks: ${urls.trainingpeaks}`,
      `• WHOOP: ${urls.whoop}`,
      '',
      `Current status: ${connectionStatus(user.id)}`,
      '',
      'Commands:',
      '/status — show current metrics',
      '/analyze <activity_id> — analyse a Strava activity',
      '/plan — weekly plan based on current form',
      '/compare <YYYY-MM-DD> <YYYY-MM-DD> — compare two periods',
      '/monitor on|off — toggle proactive alerts',
      '',
      'Or just send me a message and I\'ll coach you.',
    ].join('\n'),
    quickActionsKeyboard
  );
});

async function handleCoachingTurn(
  ctx: any,
  userId: number,
  prompt: string
): Promise<void> {
  const rl = checkRateLimit(userId);
  if (!rl.allowed) {
    const secs = Math.ceil(rl.retryAfterMs / 1000);
    await ctx.reply(
      `⏳ Rate limit hit. Give me ~${secs}s before the next question.`
    );
    return;
  }
  if (isUserBusy(userId)) {
    await ctx.reply(
      '⏳ Still working on your previous message — hang on a sec.'
    );
    // Fall through: the lock will serialise this turn after the previous one.
  }
  await withUserLock(userId, async () => {
    await ctx.sendChatAction('typing');
    appendMessage({
      user_id: userId,
      role: 'user',
      content: prompt,
      created_at: now(),
    });
    try {
      const data = await fetchAllData(userId);
      const history = getRecentMessages(userId, 10);
      const profile = getProfile(userId);
      const response = await getCoachingResponse(prompt, data, history, profile);
      appendMessage({
        user_id: userId,
        role: 'assistant',
        content: JSON.stringify(response),
        created_at: now(),
      });
      await ctx.replyWithMarkdown(
        formatForTelegram(response),
        quickActionsKeyboard
      );
      // Fire-and-forget rolling summary. Never block the user on it.
      maybeSummarize(userId).catch((e) =>
        logger.error({ userId, err: String(e) }, 'summary background failure')
      );
    } catch (err) {
      logger.error({ userId, err: String(err) }, 'coaching turn failed');
      await ctx.reply(
        `Sorry — I hit an error: ${(err as Error).message}. Try again in a moment.`
      );
    }
  });
}

bot.action(/^qa:(status|plan|ready|rest)$/, async (ctx) => {
  const action = ctx.match[1];
  await ctx.answerCbQuery();
  const user = upsertUser(ctx.from!.id);
  if (action === 'status') {
    await sendStatus(ctx, user.id);
    return;
  }
  const prompts: Record<string, string> = {
    plan: 'Build a concise 7-day training plan based on my current form and recovery.',
    ready:
      'Based on my current recovery, form and recent load, should I do a hard workout today? Be decisive (Yes / No / Modify).',
    rest: 'Do I need a rest day today? Use WHOOP recovery, TSB, and recent TSS trend.',
  };
  await handleCoachingTurn(ctx, user.id, prompts[action]);
});

async function sendStatus(ctx: any, userId: number): Promise<void> {
  await ctx.sendChatAction('typing');
  try {
    const data = await fetchAllData(userId);
    const lines: string[] = ['📊 *Current metrics*'];
    if ('unavailable' in data.trainingpeaks) {
      lines.push(`TrainingPeaks: unavailable (${data.trainingpeaks.reason})`);
    } else {
      const tp = data.trainingpeaks;
      lines.push(
        `CTL ${tp.ctl.toFixed(1)} · ATL ${tp.atl.toFixed(1)} · TSB ${tp.tsb.toFixed(
          1
        )} · 7d TSS ${tp.tss_7day.toFixed(0)}`
      );
    }
    if ('unavailable' in data.whoop) {
      lines.push(`WHOOP: unavailable (${data.whoop.reason})`);
    } else {
      const w = data.whoop.today;
      lines.push(
        `WHOOP recovery ${w.recovery_score}% · HRV ${w.hrv.toFixed(
          0
        )}ms · RHR ${w.resting_heart_rate} · Sleep ${w.sleep_performance}%`
      );
    }
    if ('unavailable' in data.strava) {
      lines.push(`Strava: unavailable (${data.strava.reason})`);
    } else {
      lines.push(
        `Strava 7d: ${data.strava.total_distance_km} km across ${data.strava.last_7_days.length} activities`
      );
    }
    await ctx.replyWithMarkdown(lines.join('\n'), quickActionsKeyboard);
  } catch (err) {
    logger.error({ userId, err: String(err) }, 'status fetch failed');
    await ctx.reply(`Failed to fetch data: ${(err as Error).message}`);
  }
}

bot.command('status', async (ctx) => {
  const user = upsertUser(ctx.from.id);
  await sendStatus(ctx, user.id);
});

const HELP_TEXT = [
  '🚴 *Cycling Coach — commands*',
  '',
  '/status — current fitness / recovery snapshot',
  '/plan — AI-generated 7-day plan',
  '/analyze `<activity_id>` — deep debrief of a Strava activity',
  '/compare `<YYYY-MM-DD> <YYYY-MM-DD>` — period-vs-period review',
  '/connect — (re)show OAuth links for Strava / TP / WHOOP',
  '/disconnect `<provider>` — revoke a connection',
  '/monitor on|off — toggle proactive alerts',
  '/profile — show athlete profile; `/profile ftp=285 weight=72` to update',
  '',
  'Or just send a text or voice message and I will coach you.',
].join('\n');

bot.command('help', async (ctx) => {
  await ctx.replyWithMarkdown(HELP_TEXT, quickActionsKeyboard);
});

bot.command('connect', async (ctx) => {
  const user = upsertUser(ctx.from.id);
  const urls = buildAuthUrls(ctx.from.id);
  await ctx.reply(
    [
      'Authorise the coach to read your data:',
      `• Strava: ${urls.strava}`,
      `• TrainingPeaks: ${urls.trainingpeaks}`,
      `• WHOOP: ${urls.whoop}`,
      '',
      `Current status: ${connectionStatus(user.id)}`,
    ].join('\n')
  );
});

const VALID_PROVIDERS: Provider[] = ['strava', 'trainingpeaks', 'whoop'];

bot.command('disconnect', async (ctx) => {
  const user = upsertUser(ctx.from.id);
  const arg = ctx.message.text.split(/\s+/)[1]?.toLowerCase();
  if (!arg || !VALID_PROVIDERS.includes(arg as Provider)) {
    return ctx.reply(
      `Usage: /disconnect strava | /disconnect trainingpeaks | /disconnect whoop`
    );
  }
  deleteToken(user.id, arg as Provider);
  await ctx.reply(`🔌 Disconnected ${arg}.`);
});

bot.command('seedtoken', async (ctx) => {
  // Admin-only helper for local / CI testing without going through a real
  // OAuth redirect. Set ADMIN_TELEGRAM_ID to your own Telegram id to unlock.
  const adminId = Number(process.env.ADMIN_TELEGRAM_ID || 0);
  if (!adminId || ctx.from.id !== adminId) {
    return ctx.reply('Not authorised.');
  }
  const parts = ctx.message.text.split(/\s+/);
  const provider = parts[1]?.toLowerCase() as Provider | undefined;
  const accessToken = parts[2];
  const refreshToken = parts[3];
  const expiresIn = parts[4] ? Number(parts[4]) : 3600;
  if (!provider || !VALID_PROVIDERS.includes(provider) || !accessToken) {
    return ctx.reply(
      `Usage: /seedtoken <strava|trainingpeaks|whoop> <access> [refresh] [expires_in_seconds]`
    );
  }
  const user = upsertUser(ctx.from.id);
  saveToken({
    user_id: user.id,
    provider,
    access_token: accessToken,
    refresh_token: refreshToken ?? null,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    extra_json: null,
  });
  await ctx.reply(`✅ Seeded ${provider} token for this account.`);
});

bot.command('monitor', async (ctx) => {
  const user = upsertUser(ctx.from.id);
  const arg = ctx.message.text.split(/\s+/)[1]?.toLowerCase();
  if (arg !== 'on' && arg !== 'off') {
    return ctx.reply('Usage: /monitor on | /monitor off');
  }
  setMonitoring(user.id, arg === 'on');
  await ctx.reply(`Proactive monitoring ${arg === 'on' ? 'enabled' : 'disabled'}.`);
});

bot.command('analyze', async (ctx) => {
  const user = upsertUser(ctx.from.id);
  const parts = ctx.message.text.split(/\s+/);
  const id = Number(parts[1]);
  if (!id) return ctx.reply('Usage: /analyze <activity_id>');
  await ctx.sendChatAction('typing');
  try {
    const act = await getActivityById(user.id, id);
    const data = await fetchAllData(user.id);

    // Best-effort: pull streams and detect intervals. If the activity has no
    // power data (or Strava 404s) we skip silently and still run a top-level
    // debrief, so indoor HR-only rides still get coaching.
    const profile = getProfile(user.id);
    let intervals: ReturnType<typeof detectIntervals> = [];
    try {
      const streams = await getActivityStreams(user.id, id);
      intervals = detectIntervals(streams, {
        ftpWatts: profile.ftp_watts ?? undefined,
      });
    } catch (err) {
      logger.warn({ id, err: String(err) }, 'streams unavailable');
    }

    const thresholdLabel = profile.ftp_watts
      ? `FTP ${profile.ftp_watts}W * 0.88`
      : 'top-decile * 0.85';
    const intervalBlock = intervals.length
      ? `\n\nDETECTED_INTERVALS (threshold = ${thresholdLabel}):\n` +
        JSON.stringify(intervals, null, 2)
      : '\n\n(No power intervals detected — either no power meter or a steady effort.)';

    const response = await getCoachingResponse(
      `Analyze this specific activity in depth. Review each interval, compare fade from first to last, and flag pacing mistakes.\n\n` +
        JSON.stringify(act, null, 2) +
        intervalBlock,
      data,
      getRecentMessages(user.id, 10),
      profile
    );
    await ctx.replyWithMarkdown(formatForTelegram(response));
  } catch (err) {
    await ctx.reply(`Could not analyze activity: ${(err as Error).message}`);
  }
});

bot.command('plan', async (ctx) => {
  const user = upsertUser(ctx.from.id);
  await ctx.sendChatAction('typing');
  try {
    const data = await fetchAllData(user.id);
    const response = await getCoachingResponse(
      'Build a 7-day training plan based on my current form, recovery and planned workouts. Include day-by-day intent, target TSS, and key sessions.',
      data,
      getRecentMessages(user.id, 10),
      getProfile(user.id)
    );
    await ctx.replyWithMarkdown(formatForTelegram(response));
  } catch (err) {
    await ctx.reply(`Could not build plan: ${(err as Error).message}`);
  }
});

bot.command('compare', async (ctx) => {
  const user = upsertUser(ctx.from.id);
  const [, a, b] = ctx.message.text.split(/\s+/);
  if (!a || !b) return ctx.reply('Usage: /compare <YYYY-MM-DD> <YYYY-MM-DD>');
  await ctx.sendChatAction('typing');
  try {
    const data = await fetchAllData(user.id);
    const response = await getCoachingResponse(
      `Compare my training and recovery metrics between ${a} and ${b}. Highlight trends in fitness (CTL), fatigue (ATL), form (TSB), and recovery.`,
      data,
      getRecentMessages(user.id, 10),
      getProfile(user.id)
    );
    await ctx.replyWithMarkdown(formatForTelegram(response));
  } catch (err) {
    await ctx.reply(`Could not compare: ${(err as Error).message}`);
  }
});

bot.command('profile', async (ctx) => {
  const user = upsertUser(ctx.from.id);
  const raw = ctx.message.text.replace(/^\/profile(?:@\S+)?\s*/i, '').trim();
  if (!raw) {
    const p = getProfile(user.id);
    await ctx.replyWithMarkdown(
      `👤 *Your athlete profile*\n\n${formatProfile(p)}\n\n` +
        '_To update:_ `/profile ftp=285 weight=72.5 maxhr=195 goal="Haute Route"`'
    );
    return;
  }
  const parsed = parseProfileArgs(raw);
  if (!parsed.ok) {
    return ctx.reply(`⚠️ ${parsed.error}`);
  }
  const updated = setProfile(user.id, parsed.patch);
  await ctx.replyWithMarkdown(`✅ *Profile updated*\n\n${formatProfile(updated)}`);
});

bot.on(message('text'), async (ctx) => {
  if (ctx.message.text.startsWith('/')) return; // commands handled above
  const user = upsertUser(ctx.from.id);
  await handleCoachingTurn(ctx, user.id, ctx.message.text);
});

async function handleAudioMessage(
  ctx: any,
  fileId: string,
  mimeType: string | undefined,
  filename: string
): Promise<void> {
  const user = upsertUser(ctx.from.id);
  if (!process.env.OPENAI_API_KEY) {
    await ctx.reply(
      'Voice messages need OPENAI_API_KEY configured. For now please send text.'
    );
    return;
  }
  await ctx.sendChatAction('typing');
  try {
    const link = await ctx.telegram.getFileLink(fileId);
    const text = await transcribeVoice(link.toString(), {
      mimeType,
      filename,
      language: process.env.WHISPER_LANGUAGE, // e.g. "en", "cs"; auto-detected if unset
    });
    if (!text) {
      await ctx.reply("I couldn't hear anything clearly — try again?");
      return;
    }
    await ctx.reply(`🎙 _Heard:_ ${text}`, { parse_mode: 'Markdown' });
    await handleCoachingTurn(ctx, user.id, text);
  } catch (err) {
    logger.error({ err: String(err) }, 'voice transcription failed');
    await ctx.reply(`Couldn't transcribe the audio: ${(err as Error).message}`);
  }
}

bot.on(message('voice'), async (ctx) => {
  const v = ctx.message.voice;
  await handleAudioMessage(ctx, v.file_id, v.mime_type, 'voice.ogg');
});

bot.on(message('audio'), async (ctx) => {
  const a = ctx.message.audio;
  await handleAudioMessage(
    ctx,
    a.file_id,
    a.mime_type,
    a.file_name || 'audio.mp3'
  );
});

// Global Telegraf error boundary — runs for any exception thrown out of a
// handler. We log it, tell the user something went wrong, and *don't* crash.
bot.catch((err, ctx) => {
  logger.error(
    {
      err: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      update: ctx.updateType,
      from: ctx.from?.id,
    },
    'unhandled bot error'
  );
  ctx
    .reply('Something went wrong on my side. Please try again in a moment.')
    .catch(() => {
      /* user may have blocked the bot, ignore */
    });
});

// Expose helper so callback handlers (hosted elsewhere) can reuse the same parser.
export { parseCoachResponse };

let httpServer: import('node:http').Server | null = null;

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'shutting down');
  try {
    bot.stop(signal);
  } catch (e) {
    logger.warn({ err: String(e) }, 'bot.stop threw');
  }
  if (httpServer) {
    await new Promise<void>((resolve) => {
      httpServer!.close(() => resolve());
      // Safety: force close after 8s so a stuck keep-alive doesn't block exit.
      setTimeout(() => resolve(), 8000).unref();
    });
  }
  try {
    const { db } = await import('./db/schema.js');
    db.close();
  } catch (e) {
    logger.warn({ err: String(e) }, 'db.close threw');
  }
  logger.info('shutdown complete');
  process.exit(0);
}

async function registerCommandMenu(): Promise<void> {
  // Published to the client so users see a slash-command autocomplete menu.
  try {
    await bot.telegram.setMyCommands([
      { command: 'status', description: 'Current fitness + recovery snapshot' },
      { command: 'plan', description: '7-day AI training plan' },
      { command: 'analyze', description: 'Deep debrief of a Strava activity' },
      { command: 'compare', description: 'Compare two date ranges' },
      { command: 'connect', description: 'Link Strava / TP / WHOOP' },
      { command: 'disconnect', description: 'Unlink a provider' },
      { command: 'monitor', description: 'Proactive alerts on/off' },
      { command: 'profile', description: 'Show / update FTP, weight, maxHR, goal' },
      { command: 'help', description: 'List all commands' },
    ]);
  } catch (e) {
    logger.warn({ err: String(e) }, 'setMyCommands failed');
  }
}

async function main() {
  httpServer = startOAuthCallbackServer(bot);
  startMonitoring(bot);
  await registerCommandMenu();
  await bot.launch();
  logger.info('bot running');
}

if (process.argv[1] && process.argv[1].endsWith('bot.js')) {
  main().catch((e) => {
    logger.fatal({ err: String(e) }, 'bot failed to start');
    process.exit(1);
  });
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ err: String(reason) }, 'unhandled rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err: err.message, stack: err.stack }, 'uncaught exception');
  // Don't auto-exit: the process manager (Fly/Railway) will restart us if we do.
  // We want to log-then-die so state is not left inconsistent.
  process.exit(1);
});
