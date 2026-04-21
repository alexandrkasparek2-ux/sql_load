import { getRecentActivities } from '../data/strava.js';
import { getTodayRecovery, getSleepHistory } from '../data/whoop.js';
import { getCustomDashboardData } from '../data/custom.js';
import { getToken } from '../db/schema.js';
import type { AthleteData } from '../types/index.js';

const TZ = process.env.TZ || 'Europe/Prague';

function unavailable(reason: string) {
  return { unavailable: true as const, reason };
}

function localDateStr(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: TZ });
}

function relativeDayLabel(activityDate: string, now: Date): string {
  const today = localDateStr(now);
  const yesterday = localDateStr(new Date(now.getTime() - 86400_000));
  const d = activityDate.slice(0, 10);
  if (d === today) return 'TODAY';
  if (d === yesterday) return 'YESTERDAY';
  const diff = Math.round(
    (new Date(today).getTime() - new Date(d).getTime()) / 86400_000
  );
  return `${diff} DAYS AGO`;
}

/**
 * Fetch data from every configured source in parallel. Each source degrades
 * independently — a WHOOP outage will not poison the Strava answer.
 */
export async function fetchAllData(userId: number): Promise<AthleteData> {
  const [stravaRes, whoopRes, customRes] = await Promise.allSettled([
    fetchStrava(userId),
    fetchWhoop(userId),
    getCustomDashboardData(),
  ]);

  return {
    strava:
      stravaRes.status === 'fulfilled'
        ? stravaRes.value
        : unavailable(String(stravaRes.reason)),
    whoop:
      whoopRes.status === 'fulfilled'
        ? whoopRes.value
        : unavailable(String(whoopRes.reason)),
    custom:
      customRes.status === 'fulfilled'
        ? customRes.value
        : {
            fetched_at: new Date().toISOString(),
            ok: false,
            error: String(customRes.reason),
          },
  };
}

async function fetchStrava(userId: number) {
  if (!getToken(userId, 'strava')) {
    throw new Error('Strava not connected');
  }
  const activities = await getRecentActivities(userId, 7);
  const now = new Date();
  const annotated = activities.map((a) => ({
    ...a,
    _day: relativeDayLabel(a.start_date, now),
  }));
  const totalDistance = activities.reduce((s, a) => s + (a.distance || 0), 0);
  const withPower = activities.filter((a) => typeof a.average_power === 'number');
  const withHr = activities.filter((a) => typeof a.average_heartrate === 'number');
  return {
    last_7_days: annotated,
    total_distance_km: +(totalDistance / 1000).toFixed(1),
    avg_power:
      withPower.length > 0
        ? Math.round(
            withPower.reduce((s, a) => s + (a.average_power ?? 0), 0) /
              withPower.length
          )
        : undefined,
    avg_heartrate:
      withHr.length > 0
        ? Math.round(
            withHr.reduce((s, a) => s + (a.average_heartrate ?? 0), 0) /
              withHr.length
          )
        : undefined,
  };
}

async function fetchWhoop(userId: number) {
  if (!getToken(userId, 'whoop')) throw new Error('WHOOP not connected');
  const [today, sleep] = await Promise.all([
    getTodayRecovery(userId),
    getSleepHistory(userId, 7),
  ]);
  return { today, sleep_history: sleep };
}
