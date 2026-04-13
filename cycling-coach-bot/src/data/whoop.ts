import { getValidAccessToken } from '../utils/auth.js';
import { withRetry } from '../utils/retry.js';
import type { WhoopRecovery, WhoopSleep } from '../types/index.js';

const WHOOP_API = 'https://api.prod.whoop.com/developer';

async function call<T>(userId: number, path: string): Promise<T> {
  const token = await getValidAccessToken(userId, 'whoop');
  return withRetry(
    async () => {
      const res = await fetch(`${WHOOP_API}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`WHOOP ${path} -> ${res.status}`);
      return (await res.json()) as T;
    },
    { label: `whoop ${path}` }
  );
}

export async function getTodayRecovery(userId: number): Promise<WhoopRecovery> {
  const start = new Date(Date.now() - 2 * 86400_000).toISOString();
  const end = new Date().toISOString();
  const res = await call<{ records: any[] }>(
    userId,
    `/v1/recovery?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=5`
  );
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
  days: number
): Promise<WhoopSleep[]> {
  const start = new Date(Date.now() - days * 86400_000).toISOString();
  const end = new Date().toISOString();
  const res = await call<{ records: any[] }>(
    userId,
    `/v1/activity/sleep?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=25`
  );
  return (res.records ?? []).map((r: any) => ({
    date: r.start ?? r.created_at,
    sleep_performance: Number(r.score?.sleep_performance_percentage ?? 0),
    total_in_bed_minutes: Math.round(
      (r.score?.stage_summary?.total_in_bed_time_milli ?? 0) / 60000
    ),
    disturbance_count: Number(r.score?.stage_summary?.disturbance_count ?? 0),
  }));
}
