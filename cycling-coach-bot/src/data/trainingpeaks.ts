import { getValidAccessToken } from '../utils/auth.js';
import { withRetry } from '../utils/retry.js';
import type { TPMetrics, TPWorkout } from '../types/index.js';

const TP_API = process.env.TP_API_BASE || 'https://api.trainingpeaks.com';

async function call<T>(userId: number, path: string): Promise<T> {
  const token = await getValidAccessToken(userId, 'trainingpeaks');
  return withRetry(
    async () => {
      const res = await fetch(`${TP_API}${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) throw new Error(`TrainingPeaks ${path} -> ${res.status}`);
      return (await res.json()) as T;
    },
    { label: `tp ${path}` }
  );
}

export async function getMetrics(
  userId: number,
  athleteId: string
): Promise<TPMetrics> {
  // TrainingPeaks exposes fitness metrics via athlete metrics endpoint. If the
  // partner account has a different route, adjust the path here.
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10);
  const series = await call<any[]>(
    userId,
    `/v1/athletes/${athleteId}/metrics?startDate=${start}&endDate=${today}`
  );
  const last = series[series.length - 1] ?? {};
  const tss_7day = series
    .slice(-7)
    .reduce((acc, d) => acc + (d.tss ?? 0), 0);
  return {
    ctl: Number(last.ctl ?? 0),
    atl: Number(last.atl ?? 0),
    tsb: Number(last.tsb ?? (last.ctl ?? 0) - (last.atl ?? 0)),
    tss_7day,
    as_of: last.date ?? today,
  };
}

export async function getPlannedWorkouts(
  userId: number,
  athleteId: string,
  days: number
): Promise<TPWorkout[]> {
  const start = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + days * 86400_000)
    .toISOString()
    .slice(0, 10);
  const list = await call<any[]>(
    userId,
    `/v1/athletes/${athleteId}/workouts?startDate=${start}&endDate=${end}`
  );
  return list.map((w) => ({
    id: String(w.workoutId ?? w.id),
    date: w.workoutDay ?? w.date,
    title: w.title ?? w.name ?? 'Workout',
    description: w.description,
    planned_tss: w.tssPlanned ?? w.plannedTss,
    planned_duration_seconds: w.totalTimePlanned
      ? Math.round(w.totalTimePlanned * 3600)
      : undefined,
    workout_type: w.workoutTypeValueName,
  }));
}
