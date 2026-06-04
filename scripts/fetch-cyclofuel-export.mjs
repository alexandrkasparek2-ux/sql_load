import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const EXPORT_URL = process.env.EXPORT_URL || 'https://vdijjrmfhftewjvrlbtm.supabase.co/functions/v1/cyclofuel-export-once';
const EXPORT_TOKEN = process.env.EXPORT_TOKEN || 'cyclofuel-export-2026-06-03-local-only';
const OUT_DIR = process.env.OUT_DIR || 'migration-export';

const res = await fetch(EXPORT_URL, {
  headers: { Authorization: `Bearer ${EXPORT_TOKEN}` },
});

if (!res.ok) {
  const body = await res.text();
  throw new Error(`Export failed: ${res.status} ${body.slice(0, 500)}`);
}

const payload = await res.json();
await mkdir(OUT_DIR, { recursive: true });

for (const [table, rows] of Object.entries(payload.tables ?? {})) {
  await writeFile(join(OUT_DIR, `${table}.json`), JSON.stringify(rows, null, 2));
  console.log(`${table}: ${Array.isArray(rows) ? rows.length : 0} rows`);
}

await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify({
  exported_at: payload.exported_at,
  counts: payload.counts,
  source: EXPORT_URL,
}, null, 2));

console.log(`Export written to ${OUT_DIR}`);
