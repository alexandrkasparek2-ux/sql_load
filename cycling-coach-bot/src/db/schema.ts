import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import type {
  AthleteProfile,
  ConversationMessage,
  OAuthTokenRow,
  Provider,
  UserRow,
} from '../types/index.js';
import { decrypt, encrypt } from '../utils/crypto.js';

const DB_URL = process.env.DATABASE_URL || './data/coach.sqlite';

function resolveSqlitePath(url: string): string {
  // Allow postgres URLs to be passed without crashing at import time — we just
  // refuse to open them here. Users who configure Postgres should swap this
  // driver for a pg pool. For the MVP, SQLite is the supported target.
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    throw new Error(
      'Postgres URL detected in DATABASE_URL. This MVP ships with a SQLite driver. ' +
        'Point DATABASE_URL to a filesystem path (e.g. ./data/coach.sqlite) or replace ' +
        'src/db/schema.ts with a pg implementation.'
    );
  }
  const resolved = path.resolve(url);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}

const dbPath = resolveSqlitePath(DB_URL);
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE NOT NULL,
    created_at INTEGER NOT NULL,
    monitoring_enabled INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS oauth_tokens (
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at INTEGER,
    extra_json TEXT,
    PRIMARY KEY (user_id, provider),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_user_created
    ON conversations(user_id, created_at);

  CREATE TABLE IF NOT EXISTS athlete_profiles (
    user_id INTEGER PRIMARY KEY,
    ftp_watts INTEGER,
    weight_kg REAL,
    max_hr INTEGER,
    goal TEXT,
    updated_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS alert_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    alert_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

export function upsertUser(telegramId: number): UserRow {
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    `INSERT INTO users (telegram_id, created_at)
     VALUES (?, ?)
     ON CONFLICT(telegram_id) DO NOTHING`
  ).run(telegramId, now);
  return db
    .prepare(`SELECT * FROM users WHERE telegram_id = ?`)
    .get(telegramId) as UserRow;
}

export function getUserByTelegramId(telegramId: number): UserRow | undefined {
  return db
    .prepare(`SELECT * FROM users WHERE telegram_id = ?`)
    .get(telegramId) as UserRow | undefined;
}

export function listMonitoredUsers(): UserRow[] {
  return db
    .prepare(`SELECT * FROM users WHERE monitoring_enabled = 1`)
    .all() as UserRow[];
}

export function setMonitoring(userId: number, enabled: boolean): void {
  db.prepare(`UPDATE users SET monitoring_enabled = ? WHERE id = ?`).run(
    enabled ? 1 : 0,
    userId
  );
}

export function saveToken(row: OAuthTokenRow): void {
  db.prepare(
    `INSERT INTO oauth_tokens
       (user_id, provider, access_token, refresh_token, expires_at, extra_json)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, provider) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       expires_at = excluded.expires_at,
       extra_json = excluded.extra_json`
  ).run(
    row.user_id,
    row.provider,
    encrypt(row.access_token)!,
    encrypt(row.refresh_token),
    row.expires_at,
    row.extra_json // not encrypted — only profile metadata (athlete id, etc.)
  );
}

export function getToken(
  userId: number,
  provider: Provider
): OAuthTokenRow | undefined {
  const raw = db
    .prepare(
      `SELECT * FROM oauth_tokens WHERE user_id = ? AND provider = ?`
    )
    .get(userId, provider) as OAuthTokenRow | undefined;
  if (!raw) return undefined;
  return {
    ...raw,
    access_token: decrypt(raw.access_token)!,
    refresh_token: decrypt(raw.refresh_token),
  };
}

export function deleteToken(userId: number, provider: Provider): void {
  db.prepare(
    `DELETE FROM oauth_tokens WHERE user_id = ? AND provider = ?`
  ).run(userId, provider);
}

export function getProfile(userId: number): AthleteProfile {
  const row = db
    .prepare(
      `SELECT ftp_watts, weight_kg, max_hr, goal, updated_at
       FROM athlete_profiles WHERE user_id = ?`
    )
    .get(userId) as AthleteProfile | undefined;
  return (
    row ?? {
      ftp_watts: null,
      weight_kg: null,
      max_hr: null,
      goal: null,
      updated_at: null,
    }
  );
}

export function setProfile(
  userId: number,
  patch: Partial<AthleteProfile>
): AthleteProfile {
  const current = getProfile(userId);
  const next: AthleteProfile = {
    ftp_watts: patch.ftp_watts ?? current.ftp_watts,
    weight_kg: patch.weight_kg ?? current.weight_kg,
    max_hr: patch.max_hr ?? current.max_hr,
    goal: patch.goal ?? current.goal,
    updated_at: Math.floor(Date.now() / 1000),
  };
  db.prepare(
    `INSERT INTO athlete_profiles
       (user_id, ftp_watts, weight_kg, max_hr, goal, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       ftp_watts = excluded.ftp_watts,
       weight_kg = excluded.weight_kg,
       max_hr = excluded.max_hr,
       goal = excluded.goal,
       updated_at = excluded.updated_at`
  ).run(
    userId,
    next.ftp_watts,
    next.weight_kg,
    next.max_hr,
    next.goal,
    next.updated_at
  );
  return next;
}

export function appendMessage(msg: ConversationMessage): void {
  db.prepare(
    `INSERT INTO conversations (user_id, role, content, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(msg.user_id, msg.role, msg.content, msg.created_at);
}

export function getRecentMessages(
  userId: number,
  limit = 20
): ConversationMessage[] {
  const rows = db
    .prepare(
      `SELECT * FROM conversations
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(userId, limit) as ConversationMessage[];
  return rows.reverse();
}

export function wasAlertSentRecently(
  userId: number,
  key: string,
  withinSeconds: number
): boolean {
  const cutoff = Math.floor(Date.now() / 1000) - withinSeconds;
  const row = db
    .prepare(
      `SELECT id FROM alert_log
       WHERE user_id = ? AND alert_key = ? AND created_at > ?
       LIMIT 1`
    )
    .get(userId, key, cutoff) as { id: number } | undefined;
  return !!row;
}

export function logAlert(userId: number, key: string): void {
  db.prepare(
    `INSERT INTO alert_log (user_id, alert_key, created_at) VALUES (?, ?, ?)`
  ).run(userId, key, Math.floor(Date.now() / 1000));
}
