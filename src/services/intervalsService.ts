// ─── Intervals.icu API service ────────────────────────────────────────────────

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

// ── Data types ────────────────────────────────────────────────
export interface IntervalsActivity {
  id:                    string;
  name:                  string;
  type:                  string;
  start_date_local:      string;
  moving_time:           number; // seconds
  distance:              number; // meters
  total_elevation_gain:  number;
  average_heartrate:     number | null;
  max_heartrate:         number | null;
  calories:              number | null;
  average_watts:         number | null;
  weighted_average_watts: number | null;
  icu_training_load:     number | null; // TSS
  icu_intensity:         number | null; // IF
  icu_joules:            number | null; // total mechanical work in joules
}

export function activityKcal(a: IntervalsActivity): number {
  // 1. přímé kalorie z přístroje
  if (a.calories && a.calories > 0) return Math.round(a.calories);
  // 2. z celkové mechanické práce (joules → kJ ≈ kcal pro cyklistiku)
  if (a.icu_joules && a.icu_joules > 0) return Math.round(a.icu_joules / 1000);
  // 3. z průměrného výkonu × čas (kJ = W × s / 1000, kJ ≈ kcal)
  if (a.average_watts && a.average_watts > 0 && a.moving_time > 0) {
    return Math.round(a.average_watts * a.moving_time / 1000);
  }
  return 0;
}

export function sportIcon(type: string): string {
  const t = type.toLowerCase();
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
    oldest: oldest.toISOString().split('T')[0],
    newest: now.toISOString().split('T')[0],
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
