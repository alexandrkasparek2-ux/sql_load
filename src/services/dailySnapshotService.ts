import { dbDelete, dbSelect, dbUpsert } from '../lib/dbClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailySnapshot {
  user_id:          string;
  date:             string; // YYYY-MM-DD

  // Consumed
  consumed_kcal:    number;
  consumed_carbs:   number;
  consumed_protein: number;
  consumed_fat:     number;
  consumed_fiber:   number;

  // Goals (frozen for this day)
  goal_kcal:        number;
  goal_carbs:       number;
  goal_protein:     number;
  goal_fat:         number;
  goal_water:       number;
  goal_fiber:       number;

  // Activity (so historical days don't lose data when cache expires)
  activity_kcal:    number;
  activity_source:  string; // 'intervals' | 'manual' | 'none'

  // Computed
  deficit_kcal:     number;

  updated_at:       string; // ISO timestamp
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsKey(userId: string, date: string) {
  return `cyclofuel_daily_snapshot_${userId}_${date}`;
}

function lsLoad(userId: string, date: string): DailySnapshot | null {
  try {
    const raw = localStorage.getItem(lsKey(userId, date));
    return raw ? (JSON.parse(raw) as DailySnapshot) : null;
  } catch { return null; }
}

function lsSave(snap: DailySnapshot) {
  try {
    localStorage.setItem(lsKey(snap.user_id, snap.date), JSON.stringify(snap));
  } catch {}
}

function lsDelete(userId: string, date: string) {
  try { localStorage.removeItem(lsKey(userId, date)); } catch {}
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function sbUpsert(snap: DailySnapshot): Promise<void> {
  try {
    await dbUpsert('daily_nutrition_snapshots', { ...snap }, ['user_id', 'date']);
  } catch {}
}

async function sbLoadBatch(userId: string, dates: string[]): Promise<DailySnapshot[]> {
  try {
    return await dbSelect<DailySnapshot>('daily_nutrition_snapshots', {
      where: { user_id: userId, date: { in: dates } },
    });
  } catch { return []; }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Save (or update) a snapshot for a given day. */
export async function saveSnapshot(snap: DailySnapshot): Promise<void> {
  lsSave(snap);          // always write localStorage immediately
  await sbUpsert(snap);  // best-effort Supabase
}

/** Load snapshot for one date. Tries localStorage first, then Supabase. */
export async function loadSnapshot(
  userId: string,
  date: string,
): Promise<DailySnapshot | null> {
  const cached = lsLoad(userId, date);
  if (cached) return cached;

  const rows = await sbLoadBatch(userId, [date]);
  if (rows[0]) {
    lsSave(rows[0]); // warm the cache
    return rows[0];
  }
  return null;
}

/**
 * Batch-load snapshots for multiple dates.
 * Returns a map of date → DailySnapshot for all dates that have a snapshot.
 */
export async function loadSnapshotBatch(
  userId: string,
  dates: string[],
): Promise<Record<string, DailySnapshot>> {
  const result: Record<string, DailySnapshot> = {};

  // Pull everything from localStorage first
  const missing: string[] = [];
  for (const d of dates) {
    const snap = lsLoad(userId, d);
    if (snap) result[d] = snap;
    else missing.push(d);
  }

  // Fetch remaining from Supabase
  if (missing.length > 0) {
    const rows = await sbLoadBatch(userId, missing);
    for (const row of rows) {
      lsSave(row); // warm the cache
      result[row.date] = row;
    }
  }

  return result;
}

/** Delete a snapshot so it gets recalculated fresh. */
export async function deleteSnapshot(userId: string, date: string): Promise<void> {
  lsDelete(userId, date);
  try {
    await dbDelete('daily_nutrition_snapshots', { user_id: userId, date });
  } catch {}
}
