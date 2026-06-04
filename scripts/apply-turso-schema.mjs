import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const database = process.env.TURSO_DB_NAME || 'cyclofuel';
const schemaFile = process.env.SCHEMA_FILE || 'db/migrations/001_cyclofuel_turso_schema.sql';

const sql = await readFile(schemaFile, 'utf8');
const statements = sql
  .split(';')
  .map(statement => statement.trim())
  .filter(statement => statement && !statement.startsWith('--'));

for (const statement of statements) {
  const result = spawnSync('turso', ['db', 'shell', database, `${statement};`], {
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Applied ${statements.length} statements to Turso database ${database}.`);
