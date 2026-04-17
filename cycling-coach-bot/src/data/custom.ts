import { withRetry } from '../utils/retry.js';
import type { CustomDashboardPayload } from '../types/index.js';

const BASE = process.env.CUSTOM_DASHBOARD_URL || 'https://sql-load-xnhd.vercel.app';
const TOKEN = process.env.CUSTOM_DASHBOARD_TOKEN;
const USER_ID = process.env.DASHBOARD_USER_ID;
// Full URL override — set this when using Supabase Edge Functions directly
// (e.g. https://xxx.supabase.co/functions/v1/athlete-summary).
// If not set, the path /api/athlete-summary is appended to CUSTOM_DASHBOARD_URL.
const SUMMARY_URL = process.env.ATHLETE_SUMMARY_URL;

/**
 * The custom SQL dashboard at https://sql-load-xnhd.vercel.app exposes an
 * `/api/athlete-summary` endpoint (see /api/athlete-summary.js at the repo
 * root). When `CUSTOM_DASHBOARD_TOKEN` (== server-side BOT_API_TOKEN) and
 * `DASHBOARD_USER_ID` are both set, we call it and return the nutrition +
 * training bundle. Otherwise we sniff a few legacy paths for backward
 * compatibility and return an "ok: false" payload if nothing answers.
 *
 * This is intentionally forgiving: the coaching engine treats the returned
 * payload as opaque context, and flags any missing data to Claude so it can
 * say "Data unavailable" instead of inventing values.
 */
const FALLBACK_PATHS = [
  '/api/metrics',
  '/api/summary',
  '/api/athlete',
  '/api/latest',
];

async function tryFetch(
  path: string,
  auth = true
): Promise<unknown | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: auth && TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchAthleteSummary(): Promise<unknown | null> {
  if (!TOKEN || !USER_ID) return null;
  const qs = new URLSearchParams({ user_id: USER_ID, days: '7' });
  const fullUrl = SUMMARY_URL
    ? `${SUMMARY_URL}?${qs.toString()}`
    : `${BASE}/api/athlete-summary?${qs.toString()}`;
  try {
    const res = await fetch(fullUrl, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getCustomDashboardData(): Promise<CustomDashboardPayload> {
  try {
    const results = await withRetry(
      async () => {
        const out: Record<string, unknown> = {};
        const summary = await fetchAthleteSummary();
        if (summary !== null) out['athlete_summary'] = summary;
        if (Object.keys(out).length === 0) {
          for (const p of FALLBACK_PATHS) {
            const data = await tryFetch(p);
            if (data !== null) out[p] = data;
          }
        }
        return out;
      },
      { label: 'custom dashboard', retries: 1 }
    );

    if (Object.keys(results).length === 0) {
      return {
        fetched_at: new Date().toISOString(),
        ok: false,
        error:
          'No reachable JSON endpoints on custom dashboard ' +
          '(set CUSTOM_DASHBOARD_TOKEN + DASHBOARD_USER_ID to enable /api/athlete-summary)',
      };
    }
    return {
      fetched_at: new Date().toISOString(),
      ok: true,
      data: results,
    };
  } catch (err) {
    return {
      fetched_at: new Date().toISOString(),
      ok: false,
      error: String(err),
    };
  }
}
