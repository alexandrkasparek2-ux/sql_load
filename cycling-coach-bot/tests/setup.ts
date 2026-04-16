// Test setup: force a fresh in-memory-equivalent SQLite file per test run and
// stub any env vars that modules may read at import time.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coach-test-'));
process.env.DATABASE_URL = path.join(tmpRoot, 'coach.sqlite');
process.env.TELEGRAM_BOT_TOKEN ||= 'test:fake';
process.env.ANTHROPIC_API_KEY ||= 'test-key';
process.env.STRAVA_CLIENT_ID ||= 'strava-id';
process.env.STRAVA_CLIENT_SECRET ||= 'strava-secret';
process.env.WHOOP_CLIENT_ID ||= 'whoop-id';
process.env.WHOOP_CLIENT_SECRET ||= 'whoop-secret';

export function tmpDir(): string {
  return tmpRoot;
}
