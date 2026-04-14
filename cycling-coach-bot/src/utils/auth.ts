import { getToken, saveToken } from '../db/schema.js';
import type { OAuthTokenRow, Provider } from '../types/index.js';

// Small wrapper to do OAuth2 refresh for each supported provider. The MVP
// assumes tokens were previously stored (e.g. via an OAuth callback handler
// hosted elsewhere or via manual seeding through /seedtoken). It transparently
// refreshes expiring tokens before returning an access token.

const REFRESH_LEEWAY_SECONDS = 60;

interface RefreshResult {
  access_token: string;
  refresh_token?: string;
  expires_at?: number; // unix seconds
  extra?: Record<string, unknown>;
}

type RefreshFn = (refreshToken: string) => Promise<RefreshResult>;

const refreshers: Record<Provider, RefreshFn> = {
  strava: async (refreshToken) => {
    const res = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: required('STRAVA_CLIENT_ID'),
        client_secret: required('STRAVA_CLIENT_SECRET'),
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`Strava refresh failed: ${res.status}`);
    const j = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
    };
    return {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: j.expires_at,
    };
  },

  whoop: async (refreshToken) => {
    const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: required('WHOOP_CLIENT_ID'),
        client_secret: required('WHOOP_CLIENT_SECRET'),
        scope: 'offline',
      }),
    });
    if (!res.ok) throw new Error(`WHOOP refresh failed: ${res.status}`);
    const j = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    return {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + j.expires_in,
    };
  },

  trainingpeaks: async (refreshToken) => {
    // TrainingPeaks uses a standard OAuth2 flow; host depends on whether the
    // account is on the public API or a partner endpoint. We default to the
    // public host and let TP_API_HOST override for partner deployments.
    const host = process.env.TP_API_HOST || 'https://oauth.trainingpeaks.com';
    const res = await fetch(`${host}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: required('TP_API_KEY'),
        client_secret: required('TP_API_SECRET'),
      }),
    });
    if (!res.ok) throw new Error(`TrainingPeaks refresh failed: ${res.status}`);
    const j = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    return {
      access_token: j.access_token,
      refresh_token: j.refresh_token ?? refreshToken,
      expires_at: Math.floor(Date.now() / 1000) + j.expires_in,
    };
  },
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/**
 * Return a valid access token for the given user+provider, refreshing it if
 * it is expired or about to expire. Throws if no token has been stored yet.
 */
export async function getValidAccessToken(
  userId: number,
  provider: Provider
): Promise<string> {
  const row = getToken(userId, provider);
  if (!row) {
    throw new Error(`No ${provider} token stored for user ${userId}`);
  }
  const now = Math.floor(Date.now() / 1000);
  const expires = row.expires_at ?? 0;
  if (expires > now + REFRESH_LEEWAY_SECONDS || !row.refresh_token) {
    return row.access_token;
  }
  const refreshed = await refreshers[provider](row.refresh_token);
  const updated: OAuthTokenRow = {
    user_id: userId,
    provider,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token ?? row.refresh_token,
    expires_at: refreshed.expires_at ?? null,
    extra_json: refreshed.extra ? JSON.stringify(refreshed.extra) : row.extra_json,
  };
  saveToken(updated);
  return updated.access_token;
}

/**
 * Build OAuth2 authorization URLs a user can click in Telegram to grant access.
 * The redirect URI must point to a callback handler you host separately that
 * exchanges the `code` for tokens and persists them via `saveToken`.
 */
export function buildAuthUrls(telegramUserId: number): Record<Provider, string> {
  // Plain value — URLSearchParams below percent-encodes it exactly once.
  // Do NOT call encodeURIComponent here or the `%` itself gets re-encoded to
  // `%25`, which some providers round-trip literally and the callback parser
  // then fails to match `tg:<id>`.
  const state = `tg:${telegramUserId}`;

  const stravaUrl =
    `https://www.strava.com/oauth/authorize?` +
    new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID || '',
      redirect_uri: process.env.STRAVA_REDIRECT_URI || '',
      response_type: 'code',
      approval_prompt: 'force',
      scope: 'activity:read_all,profile:read_all',
      state,
    }).toString();

  const whoopUrl =
    `https://api.prod.whoop.com/oauth/oauth2/auth?` +
    new URLSearchParams({
      client_id: process.env.WHOOP_CLIENT_ID || '',
      redirect_uri: process.env.WHOOP_REDIRECT_URI || '',
      response_type: 'code',
      scope: 'read:recovery read:sleep read:workout read:profile offline',
      state,
    }).toString();

  const tpHost = process.env.TP_API_HOST || 'https://oauth.trainingpeaks.com';
  const tpUrl =
    `${tpHost}/OAuth/Authorize?` +
    new URLSearchParams({
      client_id: process.env.TP_API_KEY || '',
      redirect_uri: process.env.TP_REDIRECT_URI || '',
      response_type: 'code',
      scope: 'athlete:profile workouts:read metrics:read',
      state,
    }).toString();

  return { strava: stravaUrl, whoop: whoopUrl, trainingpeaks: tpUrl };
}
