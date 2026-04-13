/**
 * Retry a function with exponential backoff. Used across API clients to tolerate
 * transient upstream failures (Strava, WHOOP and Claude all occasionally 5xx).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number; label?: string } = {}
): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseMs = opts.baseMs ?? 500;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      const delay = baseMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  const prefix = opts.label ? `[${opts.label}] ` : '';
  throw new Error(`${prefix}failed after retries: ${String(lastErr)}`);
}
