import http from 'node:http';
import { URL } from 'node:url';
import type { Telegraf } from 'telegraf';
import { getUserByTelegramId, saveToken, upsertUser } from '../db/schema.js';
import type { OAuthTokenRow, Provider } from '../types/index.js';
import { logger } from './logger.js';
import { handleStravaWebhookRequest } from './stravaWebhook.js';

/**
 * Minimal OAuth2 callback server. Each provider redirects the athlete back to
 * `/oauth/<provider>/callback?code=...&state=tg:<telegram_id>`. We exchange the
 * code for tokens and persist them via `saveToken`, then show a short success
 * page that tells the user to go back to Telegram.
 *
 * This is intentionally standalone so it can also run as a Vercel/Express
 * function if you prefer. The bot launches this server when OAUTH_CALLBACK_PORT
 * is set.
 */

interface ExchangeResult {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  extra?: Record<string, unknown>;
}

type Exchanger = (code: string) => Promise<ExchangeResult>;

const exchangers: Record<Provider, Exchanger> = {
  strava: async (code) => {
    const res = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: must('STRAVA_CLIENT_ID'),
        client_secret: must('STRAVA_CLIENT_SECRET'),
        code,
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) throw new Error(`Strava token exchange ${res.status}`);
    const j = (await res.json()) as any;
    return {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: j.expires_at,
      extra: { athlete: j.athlete },
    };
  },

  whoop: async (code) => {
    const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: must('WHOOP_CLIENT_ID'),
        client_secret: must('WHOOP_CLIENT_SECRET'),
        redirect_uri: must('WHOOP_REDIRECT_URI'),
      }),
    });
    if (!res.ok) throw new Error(`WHOOP token exchange ${res.status}`);
    const j = (await res.json()) as any;
    return {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (j.expires_in ?? 3600),
    };
  },

  trainingpeaks: async (code) => {
    const host = process.env.TP_API_HOST || 'https://oauth.trainingpeaks.com';
    const res = await fetch(`${host}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: must('TP_API_KEY'),
        client_secret: must('TP_API_SECRET'),
        redirect_uri: must('TP_REDIRECT_URI'),
      }),
    });
    if (!res.ok) throw new Error(`TrainingPeaks token exchange ${res.status}`);
    const j = (await res.json()) as any;
    return {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (j.expires_in ?? 3600),
    };
  },
};

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function parseState(state: string | null): number | null {
  if (!state) return null;
  // Tolerate a double-encoded `tg%3A<id>` as well as the normal `tg:<id>`.
  // Some providers (Strava in particular) round-trip the `state` literally,
  // so if we accidentally sent it already-encoded they send it back encoded.
  let candidate = state;
  if (candidate.startsWith('tg%3A') || candidate.startsWith('tg%3a')) {
    try {
      candidate = decodeURIComponent(candidate);
    } catch {
      // fall through — regex will fail and we'll return null
    }
  }
  const m = /^tg:(\d+)$/.exec(candidate);
  return m ? Number(m[1]) : null;
}

function htmlPage(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{font-family:-apple-system,system-ui,sans-serif;max-width:480px;margin:3rem auto;padding:1rem;color:#111}
  h1{font-size:1.3rem}code{background:#f3f4f6;padding:2px 6px;border-radius:4px}</style>
  </head><body><h1>${title}</h1>${body}</body></html>`;
}

async function handle(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  bot: Telegraf | null
) {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        uptime_seconds: Math.floor(process.uptime()),
      })
    );
    return;
  }

  if (url.pathname === '/webhooks/strava' && bot) {
    handleStravaWebhookRequest(req, res, bot);
    return;
  }

  const match = /^\/oauth\/(strava|trainingpeaks|whoop)\/callback$/.exec(
    url.pathname
  );
  if (!match) {
    res.writeHead(404).end('not found');
    return;
  }
  const provider = match[1] as Provider;
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const telegramId = parseState(stateRaw);
  const errorParam = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // Log every callback hit so we can diagnose missing-param situations in
  // production (Railway logs).
  logger.info(
    {
      provider,
      hasCode: Boolean(code),
      stateRaw,
      telegramId,
      error: errorParam,
      errorDescription,
      query: Object.fromEntries(url.searchParams.entries()),
    },
    'oauth callback received'
  );

  if (errorParam) {
    res.writeHead(400, { 'content-type': 'text/html' });
    res.end(
      htmlPage(
        `${provider} authorization denied`,
        `<p>Provider returned <code>${errorParam}</code>${
          errorDescription ? `: ${errorDescription}` : ''
        }.</p><p>Go back to Telegram and try <code>/connect</code> again.</p>`
      )
    );
    return;
  }

  if (!code || !telegramId) {
    const paramsDump = Array.from(url.searchParams.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    res.writeHead(400, { 'content-type': 'text/html' });
    res.end(
      htmlPage(
        'Missing parameters',
        `<p>OAuth callback is missing <code>code</code> or <code>state</code>.</p>
         <p><strong>Received query:</strong> <code>${paramsDump || '(empty)'}</code></p>
         <p>Open the <code>/connect</code> link in a regular browser (Safari / Chrome), not the in-app browser.</p>`
      )
    );
    return;
  }

  try {
    const exchanged = await exchangers[provider](code);
    const user = getUserByTelegramId(telegramId) ?? upsertUser(telegramId);
    const row: OAuthTokenRow = {
      user_id: user.id,
      provider,
      access_token: exchanged.access_token,
      refresh_token: exchanged.refresh_token ?? null,
      expires_at: exchanged.expires_at ?? null,
      extra_json: exchanged.extra ? JSON.stringify(exchanged.extra) : null,
    };
    saveToken(row);
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(
      htmlPage(
        `${provider} connected ✅`,
        `<p>You can now close this window and return to Telegram.</p>`
      )
    );
  } catch (err) {
    logger.error({ provider, err: String(err) }, 'oauth exchange failed');
    res.writeHead(500, { 'content-type': 'text/html' });
    res.end(
      htmlPage(
        'Something went wrong',
        `<p>${String(err)}</p><p>Try again from the Telegram bot.</p>`
      )
    );
  }
}

export function startOAuthCallbackServer(
  bot: Telegraf | null = null
): http.Server | null {
  const port = Number(process.env.OAUTH_CALLBACK_PORT || 0);
  if (!port) return null;
  const server = http.createServer((req, res) => {
    handle(req, res, bot).catch((e) => {
      logger.error({ err: String(e) }, 'oauth handler error');
      res.writeHead(500).end('error');
    });
  });
  server.listen(port, () => {
    logger.info({ port }, 'oauth/http server listening');
  });
  return server;
}
