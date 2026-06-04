import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = process.env.OUT_DIR || 'migration-export';
const DB_FILE = process.env.DB_FILE || join(OUT_DIR, 'cyclofuel-turso.db');
const SCHEMA_FILE = process.env.SCHEMA_FILE || 'db/migrations/001_cyclofuel_turso_schema.sql';
const IMPORT_FILE = process.env.IMPORT_FILE || join(OUT_DIR, 'turso-import.sql');

function runSql(file) {
  const result = spawnSync('sqlite3', [DB_FILE, `.read ${file}`], {
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

await mkdir(OUT_DIR, { recursive: true });
if (existsSync(DB_FILE)) rmSync(DB_FILE);

runSql(SCHEMA_FILE);

if (existsSync(IMPORT_FILE)) {
  runSql(IMPORT_FILE);
} else {
  console.warn(`Import file not found: ${IMPORT_FILE}`);
  console.warn('Created an empty schema database only.');
}

console.log(`SQLite database written to ${DB_FILE}`);
