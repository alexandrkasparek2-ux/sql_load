/**
 * Minimal in-memory token bucket per Telegram user. Keeps Claude spend bounded
 * if someone spams the bot and prevents Telegram rate-limit bans.
 *
 * Default: 20 messages per 5 minute window. Configurable via env.
 */

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 5 * 60 * 1000);
const MAX_IN_WINDOW = Number(process.env.RATE_LIMIT_MAX || 20);

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<number, Bucket>();

export function checkRateLimit(userId: number): {
  allowed: boolean;
  retryAfterMs: number;
} {
  const now = Date.now();
  const bucket = buckets.get(userId) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);
  if (bucket.timestamps.length >= MAX_IN_WINDOW) {
    const oldest = bucket.timestamps[0];
    return {
      allowed: false,
      retryAfterMs: WINDOW_MS - (now - oldest),
    };
  }
  bucket.timestamps.push(now);
  buckets.set(userId, bucket);
  return { allowed: true, retryAfterMs: 0 };
}
