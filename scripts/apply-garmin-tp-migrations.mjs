#!/usr/bin/env node
/**
 * Apply Garmin + TrainingPeaks DB migrations to Turso.
 *
 * Usage:
 *   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." node scripts/apply-garmin-tp-migrations.mjs
 *
 * Or if you have a .env / .env.local with those vars, load them first.
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables.');
  process.exit(1);
}

const db = createClient({ url, authToken });

const migrations = [
  { file: 'db/migrations/002_garmin_schema.sql', label: 'Garmin schema' },
  { file: 'db/migrations/003_tp_workouts.sql', label: 'TrainingPeaks schema' },
];

for (const m of migrations) {
  console.log(`Applying ${m.label} (${m.file})...`);
  const sql = readFileSync(m.file, 'utf-8');
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    await db.execute(stmt + ';');
  }
  console.log(`  Done.`);
}

console.log('\nAll migrations applied successfully.');
