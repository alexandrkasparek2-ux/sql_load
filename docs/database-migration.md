# CycloFuel database migration

This migration moves the app data from Supabase Postgres to another database.
The preferred target is Turso/libSQL.

## Current status

- Database size is small, roughly 13 MB total.
- Public app data is roughly 1.3 MB.
- Storage is empty.
- The expensive part is likely API/Auth metering, not database storage.
- Supabase is currently restricted by egress quota, so REST/Edge exports fail with HTTP 402.

## No-pay reset plan

The food catalogue does not need database migration. It lives in
`src/constants/foods.ts` and currently contains hundreds of foods, including
Tagliatelle and Science in Sport REGO Rapid Recovery.

For a clean Turso start without paying to unlock Supabase:

1. Keep the built-in food catalogue in code.
2. Seed a single app user, profile, target weight, start weight, deficit level,
   saved meals, custom foods and an initial weight log.
3. Accept that historical `food_entries` are intentionally not restored.
4. Reconnect Intervals.icu in the app and backfill training context from there.
5. Let new food entries, supplements and snapshots write to Turso going forward.

The baseline seed is:

```bash
npm run db:seed:turso
```

Production environment variables for Vercel:

```bash
TURSO_DATABASE_URL="libsql://cyclofuel-alexandrkasparek2-ux.aws-eu-west-1.turso.io"
TURSO_AUTH_TOKEN="<create with: turso db tokens create cyclofuel>"
CYCLOFUEL_USER_ID="cyclofuel-main-user"
CYCLOFUEL_APP_PASSWORD="<strong private password>"
CYCLOFUEL_SESSION_SECRET="<random 64-character secret>"
```

Do not commit passwords, `TURSO_AUTH_TOKEN`, or `CYCLOFUEL_SESSION_SECRET` to
the repository. The app uses a signed 30-day HttpOnly cookie, and
`/api/cyclofuel-db` rejects requests without a valid session.

Optional overrides:

```bash
CYCLOFUEL_WEIGHT_KG=77 \
CYCLOFUEL_HEIGHT_CM=171 \
CYCLOFUEL_AGE=23 \
CYCLOFUEL_TARGET_WEIGHT_KG=72 \
npm run db:seed:turso
```

## Turso target shape

- `db/migrations/001_cyclofuel_turso_schema.sql` creates the SQLite/libSQL schema.
- `scripts/build-turso-import-sql.mjs` converts Supabase JSON exports into SQLite SQL.
- `scripts/create-turso-sqlite-db.mjs` creates `migration-export/cyclofuel-turso.db`.
- Upload the generated `.db` file to Turso using Turso CLI/dashboard.

Turso uses SQLite/libSQL, not Postgres. That means:

- UUIDs are stored as `text`.
- dates/timestamps are stored as ISO text.
- JSONB/text arrays are stored as JSON text.
- Supabase RLS must be replaced by API-route authorization.

## Postgres target shape

- `db/migrations/001_cyclofuel_schema.sql` creates the target Postgres schema.
- Supabase RLS is replaced by API-route authorization in the app backend.
- `app_users` replaces the old dependency on `auth.users`.

## Safe Turso migration order

1. Create a Turso database in the dashboard.
2. Export Supabase data locally:

```bash
SUPABASE_URL="https://PROJECT.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="..." \
npm run db:export:supabase
```

3. Build Turso import SQL:

```bash
npm run db:build-turso-import
```

4. Create local SQLite database:

```bash
npm run db:create-turso-db
```

5. Import `migration-export/cyclofuel-turso.db` into Turso.

With Turso CLI this is typically:

```bash
turso db import cyclofuel migration-export/cyclofuel-turso.db
```

Check the latest Turso import docs before running the final command:
https://docs.turso.tech/cli/db/import

6. Add Vercel env vars:

```bash
TURSO_DATABASE_URL="libsql://..."
TURSO_AUTH_TOKEN="..."
```

7. Deploy API routes that read/write Turso.
8. Switch the frontend from Supabase hooks to the API client.
9. Keep Supabase read-only for a few days as rollback backup.

## Safe Postgres migration order

1. Create a new Postgres database.
2. Run `db/migrations/001_cyclofuel_schema.sql` on the new database.
3. Export Supabase data locally:

```bash
SUPABASE_URL="https://PROJECT.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="..." \
npm run db:export:supabase
```

4. Build import SQL:

```bash
npm run db:build-import
```

5. Import data into the new database:

```bash
psql "$DATABASE_URL" -f migration-export/import-data.sql
```

6. Compare row counts between Supabase and the target database.
7. Deploy API routes that read/write the new database.
8. Switch the frontend from Supabase hooks to the API client.
9. Keep Supabase read-only for a few days as rollback backup.

## Cutover rule

Do not remove Supabase env vars or pause Supabase until the app can:

- log in,
- load today's food entries,
- add/edit/delete food entries,
- load weekly history,
- save profile,
- save training day,
- save supplements,
- sync across phone and notebook.

## Rollback

If anything fails during cutover, restore the previous Vercel deployment and
keep using Supabase. The export scripts do not modify Supabase data.
