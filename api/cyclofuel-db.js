import { createClient } from '@libsql/client';
import { timingSafeEqual } from 'node:crypto';
import { requireSession } from './_auth.js';

const JSON_COLUMNS = new Set([
  'extra_types',
  'activity_hours',
  'activity_intensity',
  'value',
]);

const BOOLEAN_COLUMNS = new Set(['taken']);

const TABLES = {
  profiles: ['id', 'weight', 'height', 'age', 'gender', 'ftp_watts', 'caloric_deficit_offseason', 'target_weight_kg', 'created_at', 'updated_at'],
  food_entries: ['id', 'user_id', 'date', 'meal_slot', 'food_id', 'food_name', 'grams', 'kcal', 'carbs', 'protein', 'fat', 'na', 'k', 'mg', 'ca', 'fe', 'vit_c', 'vit_d', 'b12', 'omega3', 'zn', 'fiber', 'created_at'],
  training_days: ['id', 'user_id', 'date', 'training_type', 'ride_hours', 'water_glasses', 'coffee_cups', 'extra_types', 'activity_hours', 'activity_intensity', 'created_at', 'updated_at'],
  weight_log: ['id', 'user_id', 'date', 'weight_kg', 'created_at', 'updated_at'],
  user_settings: ['id', 'user_id', 'key', 'value', 'created_at', 'updated_at'],
  supplement_log: ['id', 'user_id', 'date', 'supplement_id', 'supplement_name', 'dose', 'unit', 'taken', 'created_at', 'taken_at'],
  daily_nutrition_snapshots: ['id', 'user_id', 'date', 'consumed_kcal', 'consumed_carbs', 'consumed_protein', 'consumed_fat', 'consumed_fiber', 'goal_kcal', 'goal_carbs', 'goal_protein', 'goal_fat', 'goal_water', 'goal_fiber', 'activity_kcal', 'activity_source', 'deficit_kcal', 'updated_at', 'created_at'],
  race_events: ['id', 'user_id', 'name', 'race_date', 'distance_km', 'elevation_m', 'estimated_duration_hours', 'race_type', 'created_at', 'updated_at'],
  nutrition_targets: ['id', 'user_id', 'date', 'phase', 'target_kcal', 'target_carbs_g', 'target_protein_g', 'target_fat_g', 'actual_kcal', 'actual_carbs_g', 'actual_protein_g', 'actual_fat_g', 'compliance_score', 'created_at', 'updated_at'],
  training_load_daily: ['id', 'user_id', 'date', 'tss', 'ctl', 'atl', 'tsb', 'training_kj', 'source', 'created_at', 'updated_at'],
  on_bike_nutrition_log: ['id', 'user_id', 'race_event_id', 'timestamp', 'item_name', 'carbs_g', 'kcal', 'notes', 'created_at'],
  garmin_wellness: ['id', 'user_id', 'date', 'resting_hr', 'hrv_overnight', 'sleep_seconds', 'sleep_score', 'body_battery_low', 'body_battery_high', 'stress_avg', 'steps', 'training_readiness', 'created_at', 'updated_at'],
  garmin_activities: ['id', 'user_id', 'garmin_id', 'name', 'type', 'start_time', 'duration_s', 'distance_m', 'calories', 'avg_hr', 'max_hr', 'elevation_m', 'avg_power', 'norm_power', 'training_effect_aerobic', 'training_effect_anaerobic', 'vo2max', 'created_at', 'updated_at'],
};

const CONFLICTS = {
  profiles: ['id'],
  food_entries: ['id'],
  training_days: ['user_id', 'date'],
  weight_log: ['user_id', 'date'],
  user_settings: ['user_id', 'key'],
  supplement_log: ['user_id', 'date', 'supplement_id'],
  daily_nutrition_snapshots: ['user_id', 'date'],
  race_events: ['id'],
  nutrition_targets: ['user_id', 'date'],
  training_load_daily: ['user_id', 'date'],
  on_bike_nutrition_log: ['id'],
  garmin_wellness: ['user_id', 'date'],
  garmin_activities: ['user_id', 'garmin_id'],
};

let client;

function getClient() {
  if (!client) {
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
      throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.');
    }
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

function assertTable(table) {
  if (!TABLES[table]) throw new Error(`Table is not allowed: ${table}`);
}

function assertColumn(table, column) {
  if (!TABLES[table].includes(column)) throw new Error(`Column is not allowed: ${table}.${column}`);
}

function ident(table, column) {
  assertColumn(table, column);
  return `"${column}"`;
}

function normalizeValue(column, value) {
  if (value === undefined) return undefined;
  if (JSON_COLUMNS.has(column)) return typeof value === 'string' ? value : JSON.stringify(value ?? null);
  if (BOOLEAN_COLUMNS.has(column)) return value ? 1 : 0;
  return value;
}

function normalizeRow(table, row) {
  const next = {};
  for (const [column, value] of Object.entries(row)) {
    if (!TABLES[table].includes(column)) continue;
    if (value === undefined) continue;
    next[column] = normalizeValue(column, value);
  }
  if (!next.id && TABLES[table].includes('id')) next.id = crypto.randomUUID();
  return next;
}

function parseRow(table, row) {
  const next = { ...row };
  for (const column of JSON_COLUMNS) {
    if (column in next && typeof next[column] === 'string') {
      try { next[column] = JSON.parse(next[column]); } catch { /* keep as string */ }
    }
  }
  if (table === 'supplement_log' && 'taken' in next) next.taken = Boolean(next.taken);
  return next;
}

function buildWhere(table, where = {}) {
  const clauses = [];
  const args = [];
  for (const [column, raw] of Object.entries(where)) {
    assertColumn(table, column);
    if (raw && typeof raw === 'object' && Array.isArray(raw.in)) {
      if (raw.in.length === 0) clauses.push('1 = 0');
      else {
        clauses.push(`${ident(table, column)} in (${raw.in.map(() => '?').join(', ')})`);
        args.push(...raw.in.map(value => normalizeValue(column, value)));
      }
    } else {
      clauses.push(`${ident(table, column)} = ?`);
      args.push(normalizeValue(column, raw));
    }
  }
  return { sql: clauses.length ? ` where ${clauses.join(' and ')}` : '', args };
}

function selectColumns(table, columns) {
  if (!columns || columns === '*') return '*';
  return columns.map(column => ident(table, column)).join(', ');
}

function json(res, status, body) {
  res.status(status).json(body);
}

function scopeRequest(table, body, userId) {
  if (table === 'profiles') {
    return {
      ...body,
      where: { ...body.where, id: userId },
      row: body.row ? { ...body.row, id: userId } : body.row,
    };
  }

  if (TABLES[table].includes('user_id')) {
    return {
      ...body,
      where: { ...body.where, user_id: userId },
      row: body.row ? { ...body.row, user_id: userId } : body.row,
    };
  }

  return body;
}

function verifyIngestSecret(req) {
  const expected = process.env.GARMIN_INGEST_SECRET;
  if (!expected) return false;
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch { return false; }
}

async function handleGarminIngest(req, res) {
  if (!verifyIngestSecret(req)) return json(res, 401, { error: 'Invalid or missing secret' });

  const userId = process.env.CYCLOFUEL_USER_ID || 'cyclofuel-main-user';
  const { activities = [], wellness = [] } = req.body || {};
  const db = getClient();
  const ops = [];

  for (const w of wellness) {
    ops.push(db.execute({
      sql: `insert into garmin_wellness
            (id, user_id, date, resting_hr, hrv_overnight, sleep_seconds, sleep_score,
             body_battery_low, body_battery_high, stress_avg, steps, training_readiness)
            values (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict (user_id, date) do update set
              resting_hr=excluded.resting_hr, hrv_overnight=excluded.hrv_overnight,
              sleep_seconds=excluded.sleep_seconds, sleep_score=excluded.sleep_score,
              body_battery_low=excluded.body_battery_low, body_battery_high=excluded.body_battery_high,
              stress_avg=excluded.stress_avg, steps=excluded.steps,
              training_readiness=excluded.training_readiness, updated_at=datetime('now')`,
      args: [userId, w.date, w.resting_hr??null, w.hrv_overnight??null,
             w.sleep_seconds??null, w.sleep_score??null,
             w.body_battery_low??null, w.body_battery_high??null,
             w.stress_avg??null, w.steps??null, w.training_readiness??null],
    }));
  }

  for (const a of activities) {
    ops.push(db.execute({
      sql: `insert into garmin_activities
            (id, user_id, garmin_id, name, type, start_time, duration_s, distance_m,
             calories, avg_hr, max_hr, elevation_m, avg_power, norm_power,
             training_effect_aerobic, training_effect_anaerobic, vo2max)
            values (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict (user_id, garmin_id) do update set
              name=excluded.name, type=excluded.type, start_time=excluded.start_time,
              duration_s=excluded.duration_s, distance_m=excluded.distance_m,
              calories=excluded.calories, avg_hr=excluded.avg_hr, max_hr=excluded.max_hr,
              elevation_m=excluded.elevation_m, avg_power=excluded.avg_power,
              norm_power=excluded.norm_power, training_effect_aerobic=excluded.training_effect_aerobic,
              training_effect_anaerobic=excluded.training_effect_anaerobic,
              vo2max=excluded.vo2max, updated_at=datetime('now')`,
      args: [userId, String(a.id??''), a.name??'', a.type??'unknown',
             a.start??null, a.duration_s??null, a.distance_m??null, a.calories??null,
             a.avg_hr??null, a.max_hr??null, a.elevation_m??null,
             a.avg_power??null, a.norm_power??null,
             a.training_effect_aerobic??null, a.training_effect_anaerobic??null, a.vo2max??null],
    }));
  }

  await Promise.all(ops);
  return json(res, 200, { ok: true, wellness_count: wellness.length, activities_count: activities.length });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (req.query.garmin_ingest === '1') {
    try { return await handleGarminIngest(req, res); }
    catch (err) { return json(res, 500, { error: err instanceof Error ? err.message : 'Ingest failed' }); }
  }

  const session = requireSession(req, res);
  if (!session) return;

  try {
    const table = req.body?.table;
    assertTable(table);
    const body = scopeRequest(table, req.body, session.userId);
    const { action } = body;

    const db = getClient();

    if (action === 'select') {
      const where = buildWhere(table, body.where);
      const order = body.order;
      const limit = Number(body.limit || 0);
      let sql = `select ${selectColumns(table, body.columns)} from "${table}"${where.sql}`;
      if (order?.column) {
        assertColumn(table, order.column);
        sql += ` order by ${ident(table, order.column)} ${order.ascending === false ? 'desc' : 'asc'}`;
      }
      if (limit > 0) sql += ` limit ${Math.min(limit, 5000)}`;
      const result = await db.execute({ sql, args: where.args });
      json(res, 200, { data: result.rows.map(row => parseRow(table, row)) });
      return;
    }

    if (action === 'insert' || action === 'upsert') {
      const row = normalizeRow(table, body.row ?? {});
      const columns = Object.keys(row);
      const args = columns.map(column => row[column]);
      const placeholders = columns.map(() => '?').join(', ');
      let sql = `insert into "${table}" (${columns.map(column => ident(table, column)).join(', ')}) values (${placeholders})`;
      if (action === 'upsert') {
        const conflict = body.conflict ?? CONFLICTS[table];
        const updates = columns.filter(column => !conflict.includes(column));
        sql += ` on conflict (${conflict.map(column => ident(table, column)).join(', ')}) do update set ${updates.map(column => `${ident(table, column)} = excluded.${ident(table, column)}`).join(', ')}`;
      }
      sql += ' returning *';
      const result = await db.execute({ sql, args });
      json(res, 200, { data: parseRow(table, result.rows[0]) });
      return;
    }

    if (action === 'update') {
      const values = normalizeRow(table, body.values ?? {});
      delete values.id;
      const columns = Object.keys(values);
      const args = columns.map(column => values[column]);
      const where = buildWhere(table, body.where);
      const sql = `update "${table}" set ${columns.map(column => `${ident(table, column)} = ?`).join(', ')}${where.sql} returning *`;
      const result = await db.execute({ sql, args: [...args, ...where.args] });
      json(res, 200, { data: result.rows.map(row => parseRow(table, row)) });
      return;
    }

    if (action === 'delete') {
      const where = buildWhere(table, body.where);
      await db.execute({ sql: `delete from "${table}"${where.sql}`, args: where.args });
      json(res, 200, { data: null });
      return;
    }

    json(res, 400, { error: `Unsupported action: ${action}` });
  } catch (error) {
    json(res, 500, { error: error instanceof Error ? error.message : 'Unknown database error' });
  }
}
