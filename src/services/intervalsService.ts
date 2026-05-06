// ─── Intervals.icu API service ────────────────────────────────────────────────

import { formatLocalISODate } from '../utils/date';

const CREDS_KEY = 'cyclofuel_intervals_creds';

export interface IntervalsCreds {
  athleteId: string; // e.g. "i123456"
  apiKey:    string;
}

export function loadCreds(): IntervalsCreds | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveCreds(c: IntervalsCreds) {
  localStorage.setItem(CREDS_KEY, JSON.stringify(c));
}

export function clearCreds() {
  localStorage.removeItem(CREDS_KEY);
}

// ── Persistent burn log (no TTL — survives Intervals cache expiry) ─────────────
const BURN_LOG_KEY = 'cyclofuel_burn_log';
export type BurnLog = Record<string, number>; // date (YYYY-MM-DD) → kcal burned

export function loadBurnLog(): BurnLog {
  try { return JSON.parse(localStorage.getItem(BURN_LOG_KEY) ?? '{}'); }
  catch { return {}; }
}

export function saveBurnLog(activities: IntervalsActivity[]) {
  const log = loadBurnLog();
  // Reset all dates covered by this sync batch, then re-accumulate
  const dates = new Set(activities.map(a => a.start_date_local.split('T')[0]));
  for (const d of dates) delete log[d];
  for (const a of activities) {
    const date = a.start_date_local.split('T')[0];
    const kcal = activityKcal(a);
    if (kcal > 0) log[date] = (log[date] ?? 0) + kcal;
  }
  localStorage.setItem(BURN_LOG_KEY, JSON.stringify(log));
}

// ── Data types ────────────────────────────────────────────────
export interface IntervalsActivity {
  id:                      string;
  name:                    string;
  type:                    string;
  start_date_local:        string;
  moving_time:             number; // seconds
  distance:                number; // meters
  total_elevation_gain:    number;
  average_heartrate:       number | null;
  max_heartrate:           number | null;
  calories:                number | null;
  icu_average_watts:       number | null; // API field name
  icu_weighted_avg_watts:  number | null; // normalized power
  icu_training_load:       number | null; // TSS / HRSS
  icu_intensity:           number | null; // IF × 100 (or HR-based IF × 100)
  icu_joules:              number | null; // total mechanical work in joules
  icu_ftp:                 number | null; // athlete FTP at activity time
  trimp:                   number | null; // Banister TRIMP
}

export function activityKcal(a: IntervalsActivity): number {
  // 1. direct calories from device
  if (a.calories && a.calories > 0) return Math.round(a.calories);
  // 2. from total mechanical work (joules → kJ ≈ kcal for cycling)
  if (a.icu_joules && a.icu_joules > 0) return Math.round(a.icu_joules / 1000);
  // 3. from recorded average power × time
  if (a.icu_average_watts && a.icu_average_watts > 0 && a.moving_time > 0) {
    return Math.round(a.icu_average_watts * a.moving_time / 1000);
  }
  // 4. estimate from FTP × HR-intensity factor (GPX rides without power meter)
  //    icu_intensity is IF × 100; estimated avg watts = IF × FTP; kJ ≈ kcal
  if (a.icu_ftp && a.icu_ftp > 0 && a.icu_intensity && a.icu_intensity > 0 && a.moving_time > 0) {
    const estWatts = (a.icu_intensity / 100) * a.icu_ftp;
    return Math.round(estWatts * a.moving_time / 1000);
  }
  // 5. last resort: TRIMP × 8 kcal (rough HR-based estimate)
  if (a.trimp && a.trimp > 0) return Math.round(a.trimp * 8);
  return 0;
}

export function sportIcon(type: string | null | undefined): string {
  const t = (type ?? '').toLowerCase();
  if (t.includes('ride') || t.includes('cycling') || t.includes('virtual')) return '🚴';
  if (t.includes('run'))    return '🏃';
  if (t.includes('swim'))   return '🏊';
  if (t.includes('walk') || t.includes('hike')) return '🥾';
  if (t.includes('ski') || t.includes('snow'))  return '⛷️';
  if (t.includes('yoga'))   return '🧘';
  if (t.includes('weight') || t.includes('workout') || t.includes('strength')) return '🏋️';
  if (t.includes('row'))    return '🚣';
  return '⚡';
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m.toString().padStart(2, '0')}min`;
}

// ── Fetch activities ──────────────────────────────────────────
function basicAuth(apiKey: string): string {
  return 'Basic ' + btoa(`API_KEY:${apiKey}`);
}

function dateRange(daysBack: number): { oldest: string; newest: string } {
  const now   = new Date();
  const oldest = new Date(now);
  oldest.setDate(now.getDate() - (daysBack - 1));
  return {
    oldest: formatLocalISODate(oldest),
    newest: formatLocalISODate(now),
  };
}

export async function fetchIntervalsActivities(
  creds: IntervalsCreds,
  daysBack = 3,
): Promise<IntervalsActivity[]> {
  const { oldest, newest } = dateRange(daysBack);
  const params = new URLSearchParams({
    athlete_id: creds.athleteId,
    oldest,
    newest,
  });

  const r = await fetch(`/api/intervals-sync?${params}`, {
    headers: { Authorization: basicAuth(creds.apiKey) },
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message ?? data.error ?? 'Intervals.icu fetch failed');
  return data as IntervalsActivity[];
}
