import { getValidAccessToken } from '../utils/auth.js';
import { withRetry } from '../utils/retry.js';
import type { StravaActivity } from '../types/index.js';

const STRAVA_API = 'https://www.strava.com/api/v3';

async function call<T>(userId: number, path: string): Promise<T> {
  const token = await getValidAccessToken(userId, 'strava');
  return withRetry(
    async () => {
      const res = await fetch(`${STRAVA_API}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Strava ${path} -> ${res.status}`);
      }
      return (await res.json()) as T;
    },
    { label: `strava ${path}` }
  );
}

export async function getRecentActivities(
  userId: number,
  days: number
): Promise<StravaActivity[]> {
  const after = Math.floor((Date.now() - days * 86400_000) / 1000);
  const list = await call<any[]>(
    userId,
    `/athlete/activities?after=${after}&per_page=50`
  );
  return list.map((a) => ({
    id: a.id,
    name: a.name,
    start_date: a.start_date,
    distance: a.distance,
    moving_time: a.moving_time,
    total_elevation_gain: a.total_elevation_gain,
    average_power: a.average_watts ?? a.device_watts,
    weighted_average_watts: a.weighted_average_watts,
    average_heartrate: a.average_heartrate,
    max_heartrate: a.max_heartrate,
    suffer_score: a.suffer_score,
    type: a.type,
  }));
}

export async function getActivityById(
  userId: number,
  id: number
): Promise<StravaActivity> {
  const a = await call<any>(userId, `/activities/${id}`);
  return {
    id: a.id,
    name: a.name,
    start_date: a.start_date,
    distance: a.distance,
    moving_time: a.moving_time,
    total_elevation_gain: a.total_elevation_gain,
    average_power: a.average_watts ?? a.device_watts,
    weighted_average_watts: a.weighted_average_watts,
    average_heartrate: a.average_heartrate,
    max_heartrate: a.max_heartrate,
    suffer_score: a.suffer_score,
    type: a.type,
  };
}
