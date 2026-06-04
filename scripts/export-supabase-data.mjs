import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const OUT_DIR = process.env.OUT_DIR || 'migration-export';

const TABLES = [
  'profiles',
  'food_entries',
  'training_days',
  'weight_log',
  'user_settings',
  'supplement_log',
  'daily_nutrition_snapshots',
  'race_events',
  'nutrition_targets',
  'training_load_daily',
  'on_bike_nutrition_log',
];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY.');
  process.exit(1);
}

async function fetchTable(table) {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
    url.searchParams.set('select', '*');
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', String(pageSize));

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${table}: ${res.status} ${body.slice(0, 300)}`);
    }

    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

await mkdir(OUT_DIR, { recursive: true });

const manifest = {
  exported_at: new Date().toISOString(),
  source: SUPABASE_URL,
  tables: {},
};

for (const table of TABLES) {
  const rows = await fetchTable(table);
  manifest.tables[table] = rows.length;
  await writeFile(join(OUT_DIR, `${table}.json`), JSON.stringify(rows, null, 2));
  console.log(`${table}: ${rows.length} rows`);
}

await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Export written to ${OUT_DIR}`);
