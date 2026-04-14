import type http from 'node:http';
import { URL } from 'node:url';
import type { Telegraf } from 'telegraf';
import { db } from '../db/schema.js';
import { getActivityById } from '../data/strava.js';
import { fetchAllData } from './aggregateData.js';
import {
  formatForTelegram,
  getCoachingResponse,
} from './claude.js';
import { getRecentMessages, appendMessage } from '../db/schema.js';
import { logger } from './logger.js';

/**
 * Strava webhook spec: https://developers.strava.com/docs/webhooks/
 *
 * Strava verifies your callback URL with a GET containing hub.mode=subscribe,
 * hub.challenge=<token>, hub.verify_token=<secret>. After verification, every
 * new activity/update is POSTed as:
 *   { object_type: "activity", object_id: 12345, aspect_type: "create",
 *     owner_id: <strava_athlete_id>, ... }
 *
 * We match owner_id → user (via oauth_tokens.extra_json.athlete.id), fetch the
 * activity details, run a short coaching pass, and DM the athlete.
 */

export function handleStravaWebhookRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  bot: Telegraf
): void {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'GET') {
    // Verification handshake.
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const expected = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
    if (mode === 'subscribe' && token && token === expected && challenge) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ 'hub.challenge': challenge }));
      return;
    }
    res.writeHead(403).end('forbidden');
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const event = JSON.parse(body);
        res.writeHead(200).end('ok'); // ack fast — Strava expects <2s
        await processEvent(event, bot).catch((e) =>
          logger.error({ err: String(e) }, 'strava-webhook process error')
        );
      } catch (e) {
        logger.error({ err: String(e) }, 'strava-webhook bad payload');
        res.writeHead(400).end('bad');
      }
    });
    return;
  }

  res.writeHead(405).end('method not allowed');
}

interface StravaEvent {
  object_type: 'activity' | 'athlete';
  object_id: number;
  aspect_type: 'create' | 'update' | 'delete';
  owner_id: number; // strava athlete id
  subscription_id: number;
  updates?: Record<string, string>;
}

async function processEvent(event: StravaEvent, bot: Telegraf): Promise<void> {
  if (event.object_type !== 'activity' || event.aspect_type !== 'create') {
    return; // ignore updates/deletes; only coach on new activities
  }

  const row = db
    .prepare(
      `SELECT u.id AS user_id, u.telegram_id, t.extra_json
       FROM oauth_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.provider = 'strava'`
    )
    .all() as Array<{ user_id: number; telegram_id: number; extra_json: string | null }>;

  const match = row.find((r) => {
    if (!r.extra_json) return false;
    try {
      const extra = JSON.parse(r.extra_json);
      return Number(extra.athlete?.id) === event.owner_id;
    } catch {
      return false;
    }
  });
  if (!match) {
    logger.warn({ athlete: event.owner_id }, 'strava-webhook: no user for athlete');
    return;
  }

  try {
    const activity = await getActivityById(match.user_id, event.object_id);
    const data = await fetchAllData(match.user_id);
    const prompt =
      `I just finished this activity — give me a brief (<=4 bullets) coach debrief: ` +
      `session quality, training load impact, and what to do tomorrow.\n\n` +
      JSON.stringify(activity, null, 2);

    const history = getRecentMessages(match.user_id, 6);
    const response = await getCoachingResponse(prompt, data, history);

    appendMessage({
      user_id: match.user_id,
      role: 'assistant',
      content: JSON.stringify(response),
      created_at: Math.floor(Date.now() / 1000),
    });

    await bot.telegram.sendMessage(
      match.telegram_id,
      `🚴 *Activity debrief: ${activity.name}*\n\n${formatForTelegram(response)}`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    logger.error({ err: String(err) }, 'strava-webhook coaching failed');
  }
}
