// ─── Whoop OAuth2 PKCE service ────────────────────────────────────────────────

const CLIENT_ID    = import.meta.env.VITE_WHOOP_CLIENT_ID ?? '';
const REDIRECT_URI = `${window.location.origin}/whoop/callback`;
const SCOPES       = 'read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline';

const TOKEN_KEY   = 'cyclofuel_whoop_tokens';
const VERIFIER_KEY = 'cyclofuel_whoop_verifier';

// ── PKCE helpers ──────────────────────────────────────────────
function randomBytes(len: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(len));
}

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
}

function generateVerifier(): string {
  return base64url(randomBytes(32));
}

async function generateChallenge(verifier: string): Promise<string> {
  return base64url(await sha256(verifier));
}

// ── Token storage ─────────────────────────────────────────────
export interface WhoopTokens {
  access_token:  string;
  refresh_token: string;
  expires_at:    number; // unix ms
}

export function loadTokens(): WhoopTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as WhoopTokens) : null;
  } catch { return null; }
}

function saveTokens(t: WhoopTokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(VERIFIER_KEY);
}

function isExpired(tokens: WhoopTokens): boolean {
  return Date.now() > tokens.expires_at - 60_000; // 1 min buffer
}

// ── OAuth flow ────────────────────────────────────────────────
export async function startOAuth() {
  const verifier   = generateVerifier();
  const challenge  = await generateChallenge(verifier);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    redirect_uri:          REDIRECT_URI,
    response_type:         'code',
    scope:                 SCOPES,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `https://api.prod.whoop.com/oauth/oauth2/auth?${params}`;
}

export async function handleCallback(code: string): Promise<WhoopTokens> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error('PKCE verifier missing — start OAuth again');

  const res = await fetch('/api/whoop-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: REDIRECT_URI }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Token exchange failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const tokens: WhoopTokens = {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    Date.now() + data.expires_in * 1000,
  };
  saveTokens(tokens);
  sessionStorage.removeItem(VERIFIER_KEY);
  return tokens;
}

async function refreshTokens(tokens: WhoopTokens): Promise<WhoopTokens> {
  const res = await fetch('/api/whoop-auth', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: tokens.refresh_token }),
  });

  if (!res.ok) {
    clearTokens();
    throw new Error('Token refresh failed — re-authenticate');
  }

  const data = await res.json();
  const next: WhoopTokens = {
    access_token:  data.access_token,
    refresh_token: data.refresh_token ?? tokens.refresh_token,
    expires_at:    Date.now() + data.expires_in * 1000,
  };
  saveTokens(next);
  return next;
}

// ── Data fetching ─────────────────────────────────────────────
export interface WhoopRecovery {
  score: {
    recovery_score:    number; // 0–100
    hrv_rmssd_milli:   number; // ms
    resting_heart_rate: number; // bpm
    user_calibrating:  boolean;
  };
  created_at: string;
}

export interface WhoopSleep {
  score: {
    sleep_performance_percentage: number;
    sleep_efficiency_percentage:  number;
  };
  start: string;
  end:   string;
}

export interface WhoopCycle {
  score: {
    strain:             number; // 0–21
    average_heart_rate: number;
    max_heart_rate:     number;
  };
  start: string;
}

export interface WhoopData {
  recovery:  WhoopRecovery | null;
  sleep:     WhoopSleep    | null;
  cycle:     WhoopCycle    | null;
  fetchedAt: string;
}

export async function fetchWhoopData(): Promise<WhoopData> {
  let tokens = loadTokens();
  if (!tokens) throw new Error('Not connected to Whoop');
  if (isExpired(tokens)) tokens = await refreshTokens(tokens);

  const res = await fetch('/api/whoop-sync', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (res.status === 401) {
    // Try refresh once
    tokens = await refreshTokens(tokens);
    const res2 = await fetch('/api/whoop-sync', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!res2.ok) throw new Error('Whoop sync failed after token refresh');
    return res2.json();
  }

  if (!res.ok) throw new Error(`Whoop sync error: ${res.status}`);
  return res.json();
}

// ── Nutrition adjustments based on recovery ───────────────────
export interface WhoopAdjustment {
  kcalMultiplier: number;
  carbsExtra:     number; // g/kg delta
  proteinExtra:   number; // g/kg delta
  message:        string;
  color:          string;
  label:          string;
}

export function calcWhoopAdjustment(
  recovery: WhoopRecovery | null,
): WhoopAdjustment {
  if (!recovery) {
    return { kcalMultiplier: 1.0, carbsExtra: 0, proteinExtra: 0,
      message: 'Whoop data není k dispozici', color: '#64748b', label: '—' };
  }

  const score = recovery.score.recovery_score;
  const hrv   = recovery.score.hrv_rmssd_milli;

  let kcalMultiplier = 1.0;
  let carbsExtra     = 0;
  let proteinExtra   = 0;
  let message = '';
  let color   = '';
  let label   = '';

  if (score >= 67) {
    kcalMultiplier = 1.0;
    carbsExtra     = hrv > 60 ? 0.3 : 0;
    message = hrv > 60
      ? 'Skvělá regenerace + vysoké HRV! Jeď naplno, tělo zvládne více sacharidů.'
      : 'Skvělá regenerace. Trénuj naplno.';
    color = '#30d158';
    label = 'Zelená';
  } else if (score >= 34) {
    kcalMultiplier = 0.95;
    carbsExtra     = hrv < 35 ? -0.3 : 0;
    proteinExtra   = 0.2;
    message = 'Střední regenerace. Lehčí trénink, více proteinu pro regeneraci.';
    color = '#ffd60a';
    label = 'Žlutá';
  } else {
    kcalMultiplier = 0.88;
    carbsExtra     = -0.5;
    proteinExtra   = 0.3;
    message = 'Nízká regenerace. Odpočinkový den — priorita spánek a lehká strava.';
    color = '#ff375f';
    label = 'Červená';
  }

  return { kcalMultiplier, carbsExtra, proteinExtra, message, color, label };
}
