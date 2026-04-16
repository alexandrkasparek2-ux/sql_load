import { getValidAccessToken } from '../utils/auth.js';
import { withRetry } from '../utils/retry.js';
import type { WhoopRecovery, WhoopSleep } from '../types/index.js';

const WHOOP_API = 'https://api.prod.whoop.com/developer';

// WHOOP v1 was retired in 2024. v2 endpoints return `records[]` for list
// resources. The recovery/sleep endpoints accept an optional ISO `start` /
// `end` range plus a `limit`. We default to the most recent items (no range)
// to avoid 400s from over-eager validation on the date format.

async function whoopGet<T>(userId: number, path: string): Promise<T> {
  const token = await getValidAccessToken(userId, 'whoop');
  return withRetry(
    async () => {
      const res = await fetch(`${WHOOP_API}${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(
          `WHOOP ${path} -> ${res.status}${body ? ` ${body.slice(0, 200)}` : ''}`
        );
      }
      return (await res.json()) as T;
    },
    { label: `whoop ${path}` }
  );
}

// Try the candidate paths in order, falling back to the next one on 404/400.
// Returns the first successful body, or throws the last error.
async function whoopGetWithFallback<T>(
  userId: number,
  candidates: string[]
): Promise<T> {
  let lastError: unknown = new Error('No candidate paths provided');
  for (const path of candidates) {
    try {
      return await whoopGet<T>(userId, path);
    } catch (err) {
      lastError = err;
      const msg = String(err);
      // Only fall through for 400/404 (path shape issues). Auth / server errors
      // should surface immediately.
      if (!/-> (400|404)/.test(msg)) throw err;
    }
  }
  throw lastError;
}

export async function getTodayRecovery(userId: number): Promise<WhoopRecovery> {
  const res = await whoopGetWithFallback<{ records?: any[] }>(userId, [
    '/v2/recovery?limit=5',
    '/v2/activity/recovery?limit=5',
    '/v1/recovery?limit=5',
  ]);
  const latest = res.records?.[0];
  if (!latest) {
    throw new Error('No recent WHOOP recovery record');
  }
  const score = latest.score ?? {};
  return {
    recovery_score: Number(score.recovery_score ?? 0),
    hrv: Number(score.hrv_rmssd_milli ?? 0),
    resting_heart_rate: Number(score.resting_heart_rate ?? 0),
    sleep_performance: Number(score.sleep_performance_percentage ?? 0),
    date: latest.created_at ?? new Date().toISOString(),
  };
}

export async function getSleepHistory(
  userId: number,
  _days: number
): Promise<WhoopSleep[]> {
  // We ignore `_days` in the URL and rely on WHOOP's default most-recent
  // ordering. Simpler than fighting per-endpoint date-format validation.
  const res = await whoopGetWithFallback<{ records?: any[] }>(userId, [
    '/v2/activity/sleep?limit=25',
    '/v2/sleep?limit=25',
    '/v1/activity/sleep?limit=25',
  ]);
  return (res.records ?? []).map((r: any) => ({
    date: r.start ?? r.created_at,
    sleep_performance: Number(r.score?.sleep_performance_percentage ?? 0),
    total_in_bed_minutes: Math.round(
      (r.score?.stage_summary?.total_in_bed_time_milli ?? 0) / 60000
    ),
    disturbance_count: Number(r.score?.stage_summary?.disturbance_count ?? 0),
  }));
}
