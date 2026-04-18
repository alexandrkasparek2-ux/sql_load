// ─── Strava OAuth2 service ────────────────────────────────────────────────────

const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID ?? '149536';

// Strava callback is registered under Railway domain.
// StravaCallback on Railway immediately bounces to Vercel with the same params.
const REDIRECT_URI = 'https://sqlload-production.up.railway.app/strava/callback';
const SCOPE        = 'activity:read_all';

const TOKEN_KEY = 'cyclofuel_strava_tokens';
const STATE_KEY = 'cyclofuel_strava_state';

// ── Token storage ─────────────────────────────────────────────
export interface StravaTokens {
  access_token:  string;
  refresh_token: string;
  expires_at:    number; // unix SECONDS (Strava uses seconds, not ms)
  athlete_id:    number;
}

export function loadStravaTokens(): StravaTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as StravaTokens) : null;
  } catch { return null; }
}

function saveStravaTokens(t: StravaTokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}

export function clearStravaTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

function isExpired(tokens: StravaTokens): boolean {
  return Date.now() / 1000 > tokens.expires_at - 60; // 1 min buffer
}

// ── OAuth flow ────────────────────────────────────────────────
export function startStravaOAuth() {
  if (!CLIENT_ID) throw new Error('VITE_STRAVA_CLIENT_ID not configured');

  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope:         SCOPE,
    state,
  });

  window.location.href = `https://www.strava.com/oauth/authorize?${params}`;
}

export async function handleStravaCallback(code: string, state?: string): Promise<void> {
  const savedState = sessionStorage.getItem(STATE_KEY);
  if (state && savedState && state !== savedState) {
    throw new Error('OAuth state mismatch — possible CSRF attack');
  }
  sessionStorage.removeItem(STATE_KEY);

  const r = await fetch('/api/strava-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message ?? data.error ?? 'Token exchange failed');

  saveStravaTokens({
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    data.expires_at,
    athlete_id:    data.athlete?.id ?? 0,
  });
}

async function refreshStravaTokens(tokens: StravaTokens): Promise<StravaTokens> {
  const r = await fetch('/api/strava-auth', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: tokens.refresh_token }),
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message ?? 'Token refresh failed');

  const fresh: StravaTokens = {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    data.expires_at,
    athlete_id:    tokens.athlete_id,
  };
  saveStravaTokens(fresh);
  return fresh;
}

async function getValidToken(): Promise<string> {
  let tokens = loadStravaTokens();
  if (!tokens) throw new Error('Not connected to Strava');
  if (isExpired(tokens)) tokens = await refreshStravaTokens(tokens);
  return tokens.access_token;
}

// ── Data types ────────────────────────────────────────────────
export interface StravaActivity {
  id:                   number;
  name:                 string;
  sport_type:           string;
  start_date:           string; // ISO UTC
  start_date_local:     string; // ISO local
  elapsed_time:         number; // seconds
  moving_time:          number; // seconds
  distance:             number; // meters
  total_elevation_gain: number;
  kilojoules:           number | null;
  calories:             number | null;
  average_heartrate:    number | null;
  max_heartrate:        number | null;
}

// Strava sometimes omits calories on list endpoint — derive from kilojoules
export function activityKcal(a: StravaActivity): number {
  if (a.calories && a.calories > 0) return Math.round(a.calories);
  // For cycling, 1 kJ ≈ 1 kcal (25% mechanical efficiency + unit conversion cancel out)
  if (a.kilojoules && a.kilojoules > 0) return Math.round(a.kilojoules);
  return 0;
}

export function sportIcon(sportType: string): string {
  const t = sportType.toLowerCase();
  if (t.includes('ride') || t.includes('cycling')) return '🚴';
  if (t.includes('run'))   return '🏃';
  if (t.includes('swim'))  return '🏊';
  if (t.includes('walk') || t.includes('hike')) return '🥾';
  if (t.includes('ski') || t.includes('snow'))  return '⛷️';
  if (t.includes('yoga'))  return '🧘';
  if (t.includes('weight') || t.includes('workout')) return '🏋️';
  return '⚡';
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m.toString().padStart(2, '0')}min`;
}

// ── Fetch activities ──────────────────────────────────────────
export async function fetchStravaActivities(daysBack = 1): Promise<StravaActivity[]> {
  const token = await getValidToken();

  const after = Math.floor(Date.now() / 1000) - daysBack * 86_400;

  const r = await fetch(`/api/strava-sync?after=${after}&per_page=30`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message ?? data.error ?? 'Strava fetch failed');
  return data as StravaActivity[];
}
