import type { StravaActivity } from '../services/stravaService';
import type { WhoopHistory } from '../services/whoopService';
import { formatLocalISODate } from './date';

export interface TrainingWeek {
  weekStart: string; // Monday, YYYY-MM-DD
  label:     string; // "1.–7. 7."
  km:        number;
  vertM:     number;
  hours:     number;
  avgHr:     number | null;
  sessions:  number;
}

export interface RecoveryWeek {
  weekStart:     string;
  label:         string;
  avgRecovery:   number | null;
  avgHrv:        number | null;
  avgRhr:        number | null;
  avgSleepHours: number | null;
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const fmt = (d: Date) => `${d.getDate()}.${d.getMonth() + 1}.`;
  return `${fmt(monday)}–${fmt(sunday)}`;
}

/** Builds the last `weeks` Monday-start week buckets, oldest first, ending with the current week. */
function buildWeekStarts(weeks: number): Date[] {
  const thisMonday = mondayOf(new Date());
  return Array.from({ length: weeks }, (_, i) => {
    const d = new Date(thisMonday);
    d.setDate(d.getDate() - (weeks - 1 - i) * 7);
    return d;
  });
}

function findBucketIndex(weekStarts: Date[], date: Date): number {
  const monday = mondayOf(date);
  return weekStarts.findIndex(w => w.getTime() === monday.getTime());
}

export function bucketActivitiesByWeek(activities: StravaActivity[], weeks: number): TrainingWeek[] {
  const weekStarts = buildWeekStarts(weeks);
  const buckets: TrainingWeek[] = weekStarts.map(w => ({
    weekStart: formatLocalISODate(w),
    label:     weekLabel(w),
    km:        0,
    vertM:     0,
    hours:     0,
    avgHr:     null,
    sessions:  0,
  }));

  const hrSum   = new Array(weeks).fill(0);
  const hrCount = new Array(weeks).fill(0);

  for (const a of activities) {
    const idx = findBucketIndex(weekStarts, new Date(a.start_date_local));
    if (idx < 0) continue;
    const b = buckets[idx];
    b.km       += a.distance / 1000;
    b.vertM    += a.total_elevation_gain;
    b.hours    += a.moving_time / 3600;
    b.sessions += 1;
    if (a.average_heartrate) {
      hrSum[idx]   += a.average_heartrate * a.moving_time;
      hrCount[idx] += a.moving_time;
    }
  }

  buckets.forEach((b, i) => {
    b.km    = Math.round(b.km * 10) / 10;
    b.vertM = Math.round(b.vertM);
    b.hours = Math.round(b.hours * 10) / 10;
    b.avgHr = hrCount[i] > 0 ? Math.round(hrSum[i] / hrCount[i]) : null;
  });

  return buckets;
}

export function bucketRecoveryByWeek(history: WhoopHistory | null, weeks: number): RecoveryWeek[] {
  const weekStarts = buildWeekStarts(weeks);
  const buckets: RecoveryWeek[] = weekStarts.map(w => ({
    weekStart:     formatLocalISODate(w),
    label:         weekLabel(w),
    avgRecovery:   null,
    avgHrv:        null,
    avgRhr:        null,
    avgSleepHours: null,
  }));
  if (!history) return buckets;

  const recSum = new Array(weeks).fill(0), recCount = new Array(weeks).fill(0);
  const hrvSum = new Array(weeks).fill(0), hrvCount = new Array(weeks).fill(0);
  const rhrSum = new Array(weeks).fill(0), rhrCount = new Array(weeks).fill(0);
  const sleepSum = new Array(weeks).fill(0), sleepCount = new Array(weeks).fill(0);

  for (const r of history.recoveries) {
    const idx = findBucketIndex(weekStarts, new Date(r.created_at));
    if (idx < 0) continue;
    recSum[idx] += r.score.recovery_score; recCount[idx] += 1;
    hrvSum[idx] += r.score.hrv_rmssd_milli; hrvCount[idx] += 1;
    rhrSum[idx] += r.score.resting_heart_rate; rhrCount[idx] += 1;
  }

  for (const s of history.sleeps) {
    const idx = findBucketIndex(weekStarts, new Date(s.start));
    if (idx < 0) continue;
    const hours = (new Date(s.end).getTime() - new Date(s.start).getTime()) / 3_600_000;
    if (hours > 0) { sleepSum[idx] += hours; sleepCount[idx] += 1; }
  }

  buckets.forEach((b, i) => {
    b.avgRecovery   = recCount[i]   > 0 ? Math.round(recSum[i] / recCount[i])           : null;
    b.avgHrv        = hrvCount[i]   > 0 ? Math.round(hrvSum[i] / hrvCount[i])           : null;
    b.avgRhr        = rhrCount[i]   > 0 ? Math.round(rhrSum[i] / rhrCount[i])           : null;
    b.avgSleepHours = sleepCount[i] > 0 ? Math.round((sleepSum[i] / sleepCount[i]) * 10) / 10 : null;
  });

  return buckets;
}
