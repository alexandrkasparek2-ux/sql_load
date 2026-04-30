export interface PlannedWorkout {
  date:        string; // YYYY-MM-DD
  title:       string;
  sportType:   string; // maps to TrainingType
  durationMin: number;
  tss:         number;
  description: string;
}

const CACHE_KEY = 'cyclofuel_tp_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 min
const URL_KEY   = 'cyclofuel_tp_ical_url';

interface Cache {
  workouts:  PlannedWorkout[];
  fetchedAt: number;
}

export function loadTPCache(): PlannedWorkout[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const c: Cache = JSON.parse(raw);
    if (Date.now() - c.fetchedAt > CACHE_TTL) return [];
    return c.workouts;
  } catch { return []; }
}

function saveTPCache(workouts: PlannedWorkout[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ workouts, fetchedAt: Date.now() }));
  } catch { /* quota */ }
}

export function loadTPUrl(): string {
  return localStorage.getItem(URL_KEY) ?? '';
}

export function saveTPUrl(url: string) {
  localStorage.setItem(URL_KEY, url.trim());
}

export function clearTPCache() {
  localStorage.removeItem(CACHE_KEY);
}

export const TP_FORCE_SYNC_EVENT = 'cyclofuel-tp-force-sync';

export async function fetchTPPlan(icalUrl: string): Promise<PlannedWorkout[]> {
  const res = await fetch(`/api/ical?url=${encodeURIComponent(icalUrl)}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error: string }).error);
  }
  const data = await res.json() as { events: PlannedWorkout[] };
  saveTPCache(data.events);
  return data.events;
}

// Nutrition recommendation based on planned workout (pure info, no calorie override)
export function workoutNutritionTip(w: PlannedWorkout): string {
  const { sportType, durationMin, tss } = w;
  const isEndurance = ['light', 'medium', 'hard', 'race', 'cycling_indoor', 'running', 'swimming'].includes(sportType);

  if (!isEndurance) {
    if (sportType === 'strength') return '💪 Silový trénink: 30–40 g bílkovin do 30 min po tréninku. Sacharidy před pro energii.';
    return '🧘 Lehký den: normální strava, dbej na hydrataci.';
  }

  if (durationMin >= 180 || tss >= 200) {
    return '🔥 Velmi dlouhý výkon: carbo-loading večer před, snídaně 2–3 h před (oat + banán), gel každých 30–45 min, min. 500 ml/hod.';
  }
  if (durationMin >= 90 || tss >= 100) {
    return '🚴 Dlouhý trénink: velké sacharidy 2 h před (rice/pasta), gel nebo tyčinka po 60 min, 500–750 ml vody/hod.';
  }
  if (durationMin >= 45 || tss >= 50) {
    return '⚡ Střední trénink: 300–400 kcal sacharidů 1,5–2 h před, láhev vody, proteiny do 30 min po.';
  }
  return '🟢 Krátký trénink: normální jídlo stačí, doplň proteiny po tréninku.';
}

export function sportIcon(type: string): string {
  const map: Record<string, string> = {
    light: '🚴', medium: '🚴', hard: '🚴', race: '🏁',
    cycling_indoor: '🏋️', running: '🏃', swimming: '🏊',
    strength: '💪', walking: '🚶', hiking: '🥾',
    yoga: '🧘', skiing: '⛷️', team_sport: '⚽',
  };
  return map[type] ?? '🏅';
}
