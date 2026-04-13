import 'dotenv/config';
import { Markup, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import {
  appendMessage,
  getRecentMessages,
  setMonitoring,
  upsertUser,
  getToken,
} from './db/schema.js';
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
    const response = await getCoachingResponse(prompt, data, history);
    appendMessage({
      user_id: userId,
      role: 'assistant',
      content: JSON.stringify(response),
      created_at: now(),
    });
    await ctx.replyWithMarkdown(formatForTelegram(response), quickActionsKeyboard);
  } catch (err) {
    console.error(err);
    await ctx.reply(
      `Sorry — I hit an error: ${(err as Error).message}. Try again in a moment.`
    );
  }
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
    console.error(err);
    await ctx.reply(`Failed to fetch data: ${(err as Error).message}`);
  }
}

bot.command('status', async (ctx) => {
  const user = upsertUser(ctx.from.id);
  await sendStatus(ctx, user.id);
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
    const response = await getCoachingResponse(
      `Analyze this specific activity in depth:\n${JSON.stringify(act, null, 2)}`,
      data,
      getRecentMessages(user.id, 10)
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
      getRecentMessages(user.id, 10)
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
      getRecentMessages(user.id, 10)
    );
    await ctx.replyWithMarkdown(formatForTelegram(response));
  } catch (err) {
    await ctx.reply(`Could not compare: ${(err as Error).message}`);
  }
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
    console.error('[voice]', err);
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

// Expose helper so callback handlers (hosted elsewhere) can reuse the same parser.
export { parseCoachResponse };

async function main() {
  startOAuthCallbackServer();
  startMonitoring(bot);
  await bot.launch();
  console.log('[bot] running');
}

if (process.argv[1] && process.argv[1].endsWith('bot.js')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
