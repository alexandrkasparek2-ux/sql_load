// POST /api/garmin-ingest
// Receives { activities, wellness } from sync_garmin.py
// Auth: Authorization: Bearer <GARMIN_INGEST_SECRET>

import { createClient } from '@libsql/client';
import { timingSafeEqual } from 'node:crypto';

let db;
function getDb() {
  if (!db) {
    db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return db;
}

function verifySecret(req) {
  const expected = process.env.GARMIN_INGEST_SECRET;
  if (!expected) return false;
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!verifySecret(req)) {
    return res.status(401).json({ error: 'Invalid or missing secret' });
  }

  const userId = process.env.CYCLOFUEL_USER_ID || 'cyclofuel-main-user';
  const { activities = [], wellness = [] } = req.body || {};
  const client = getDb();

  try {
    const ops = [];

    for (const w of wellness) {
      ops.push(client.execute({
        sql: `insert into garmin_wellness
              (id, user_id, date, resting_hr, hrv_overnight, sleep_seconds, sleep_score,
               body_battery_low, body_battery_high, stress_avg, steps, training_readiness)
              values (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              on conflict (user_id, date) do update set
                resting_hr = excluded.resting_hr,
                hrv_overnight = excluded.hrv_overnight,
                sleep_seconds = excluded.sleep_seconds,
                sleep_score = excluded.sleep_score,
                body_battery_low = excluded.body_battery_low,
                body_battery_high = excluded.body_battery_high,
                stress_avg = excluded.stress_avg,
                steps = excluded.steps,
                training_readiness = excluded.training_readiness,
                updated_at = datetime('now')`,
        args: [
          userId, w.date,
          w.resting_hr ?? null, w.hrv_overnight ?? null,
          w.sleep_seconds ?? null, w.sleep_score ?? null,
          w.body_battery_low ?? null, w.body_battery_high ?? null,
          w.stress_avg ?? null, w.steps ?? null,
          w.training_readiness ?? null,
        ],
      }));
    }

    for (const a of activities) {
      ops.push(client.execute({
        sql: `insert into garmin_activities
              (id, user_id, garmin_id, name, type, start_time, duration_s,
               distance_m, calories, avg_hr, max_hr, elevation_m,
               avg_power, norm_power,
               training_effect_aerobic, training_effect_anaerobic, vo2max)
              values (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              on conflict (user_id, garmin_id) do update set
                name = excluded.name,
                type = excluded.type,
                start_time = excluded.start_time,
                duration_s = excluded.duration_s,
                distance_m = excluded.distance_m,
                calories = excluded.calories,
                avg_hr = excluded.avg_hr,
                max_hr = excluded.max_hr,
                elevation_m = excluded.elevation_m,
                avg_power = excluded.avg_power,
                norm_power = excluded.norm_power,
                training_effect_aerobic = excluded.training_effect_aerobic,
                training_effect_anaerobic = excluded.training_effect_anaerobic,
                vo2max = excluded.vo2max,
                updated_at = datetime('now')`,
        args: [
          userId, String(a.id ?? ''), a.name ?? '', a.type ?? 'unknown',
          a.start ?? null, a.duration_s ?? null,
          a.distance_m ?? null, a.calories ?? null,
          a.avg_hr ?? null, a.max_hr ?? null, a.elevation_m ?? null,
          a.avg_power ?? null, a.norm_power ?? null,
          a.training_effect_aerobic ?? null, a.training_effect_anaerobic ?? null,
          a.vo2max ?? null,
        ],
      }));
    }

    await Promise.all(ops);

    return res.json({
      ok: true,
      wellness_count: wellness.length,
      activities_count: activities.length,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Ingest failed',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
