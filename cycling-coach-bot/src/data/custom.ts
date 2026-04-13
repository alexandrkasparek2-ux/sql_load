import { withRetry } from '../utils/retry.js';
import type { CustomDashboardPayload } from '../types/index.js';

const BASE = process.env.CUSTOM_DASHBOARD_URL || 'https://sql-load-xnhd.vercel.app';
const TOKEN = process.env.CUSTOM_DASHBOARD_TOKEN;

/**
 * The custom SQL dashboard at https://sql-load-xnhd.vercel.app exposes an
 * `api/*` endpoint surface (see repository /api folder). We optimistically try
 * a few likely endpoints and fall back to empty data if none are reachable.
 *
 * This is intentionally forgiving: the coaching engine treats the returned
 * payload as opaque context, and flags any missing data to Claude so it can
 * say "Data unavailable" instead of inventing values.
 */
const CANDIDATE_PATHS = [
  '/api/metrics',
  '/api/summary',
  '/api/athlete',
  '/api/latest',
];

async function tryFetch(path: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : undefined,
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
        for (const p of CANDIDATE_PATHS) {
          const data = await tryFetch(p);
          if (data !== null) out[p] = data;
        }
        return out;
      },
      { label: 'custom dashboard', retries: 1 }
    );

    if (Object.keys(results).length === 0) {
      return {
        fetched_at: new Date().toISOString(),
        ok: false,
        error: 'No reachable JSON endpoints on custom dashboard',
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
