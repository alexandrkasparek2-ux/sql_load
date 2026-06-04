import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DB_NAME = process.env.TURSO_DB_NAME || 'cyclofuel';
const USER_ID = process.env.CYCLOFUEL_USER_ID || 'cyclofuel-main-user';
const EMAIL = process.env.CYCLOFUEL_USER_EMAIL || 'alexandrkasparek2-ux@cyclofuel.local';
const DISPLAY_NAME = process.env.CYCLOFUEL_DISPLAY_NAME || 'Alexandr';

const PROFILE = {
  weight: Number(process.env.CYCLOFUEL_WEIGHT_KG || 77),
  height: Number(process.env.CYCLOFUEL_HEIGHT_CM || 171),
  age: Number(process.env.CYCLOFUEL_AGE || 23),
  gender: process.env.CYCLOFUEL_GENDER || 'male',
  ftpWatts: Number(process.env.CYCLOFUEL_FTP_WATTS || 250),
  targetWeight: Number(process.env.CYCLOFUEL_TARGET_WEIGHT_KG || 72),
};

const today = new Date().toISOString().slice(0, 10);

function sqlValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'object') value = JSON.stringify(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function setting(id, key, value) {
  return [
    'insert into user_settings (id, user_id, key, value) values',
    `(${sqlValue(id)}, ${sqlValue(USER_ID)}, ${sqlValue(key)}, ${sqlValue(JSON.stringify(value))})`,
    'on conflict (user_id, key) do update set value = excluded.value, updated_at = datetime(\'now\');',
  ].join(' ');
}

const sql = [
  'pragma foreign_keys = on;',
  'begin transaction;',
  [
    'insert into app_users (id, email, display_name) values',
    `(${sqlValue(USER_ID)}, ${sqlValue(EMAIL)}, ${sqlValue(DISPLAY_NAME)})`,
    'on conflict (id) do update set email = excluded.email, display_name = excluded.display_name, updated_at = datetime(\'now\');',
  ].join(' '),
  [
    'insert into profiles (id, weight, height, age, gender, ftp_watts, target_weight_kg) values',
    `(${sqlValue(USER_ID)}, ${sqlValue(PROFILE.weight)}, ${sqlValue(PROFILE.height)}, ${sqlValue(PROFILE.age)}, ${sqlValue(PROFILE.gender)}, ${sqlValue(PROFILE.ftpWatts)}, ${sqlValue(PROFILE.targetWeight)})`,
    'on conflict (id) do update set weight = excluded.weight, height = excluded.height, age = excluded.age, gender = excluded.gender, ftp_watts = excluded.ftp_watts, target_weight_kg = excluded.target_weight_kg, updated_at = datetime(\'now\');',
  ].join(' '),
  [
    'insert into weight_log (id, user_id, date, weight_kg) values',
    `(${sqlValue(`weight-${USER_ID}-${today}`)}, ${sqlValue(USER_ID)}, ${sqlValue(today)}, ${sqlValue(PROFILE.weight)})`,
    'on conflict (user_id, date) do update set weight_kg = excluded.weight_kg, updated_at = datetime(\'now\');',
  ].join(' '),
  setting(`setting-${USER_ID}-daily-goals`, 'daily_goals', {}),
  setting(`setting-${USER_ID}-saved-meals`, 'saved_meals', []),
  setting(`setting-${USER_ID}-custom-foods`, 'custom_foods', []),
  setting(`setting-${USER_ID}-target-weight`, 'target_weight', PROFILE.targetWeight),
  setting(`setting-${USER_ID}-start-weight`, 'start_weight', PROFILE.weight),
  setting(`setting-${USER_ID}-deficit-level`, 'deficit_level', 'off'),
  setting(`setting-${USER_ID}-weight-log`, 'weight_log', [{ date: today, weight: PROFILE.weight }]),
  'commit;',
].join('\n');

try {
  const { stdout, stderr } = await execFileAsync('turso', ['db', 'shell', DB_NAME, sql], {
    maxBuffer: 1024 * 1024,
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
  console.log(`Seeded ${DB_NAME} for user ${USER_ID}.`);
} catch (error) {
  console.error(error.stderr || error.message);
  process.exit(error.code || 1);
}
