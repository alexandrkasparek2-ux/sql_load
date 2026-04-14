import './setup.js';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('rate limiter', () => {
  beforeEach(() => {
    process.env.RATE_LIMIT_WINDOW_MS = '1000';
    process.env.RATE_LIMIT_MAX = '3';
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows up to RATE_LIMIT_MAX within the window', async () => {
    const { checkRateLimit } = await import('../src/utils/rateLimit.js');
    expect(checkRateLimit(1).allowed).toBe(true);
    expect(checkRateLimit(1).allowed).toBe(true);
    expect(checkRateLimit(1).allowed).toBe(true);
    const r = checkRateLimit(1);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it('keeps per-user buckets independent', async () => {
    const { checkRateLimit } = await import('../src/utils/rateLimit.js');
    checkRateLimit(10);
    checkRateLimit(10);
    checkRateLimit(10);
    expect(checkRateLimit(10).allowed).toBe(false);
    expect(checkRateLimit(11).allowed).toBe(true);
  });

  it('refills after the window elapses', async () => {
    vi.useFakeTimers();
    const { checkRateLimit } = await import('../src/utils/rateLimit.js');
    checkRateLimit(42);
    checkRateLimit(42);
    checkRateLimit(42);
    expect(checkRateLimit(42).allowed).toBe(false);
    vi.advanceTimersByTime(1_500);
    expect(checkRateLimit(42).allowed).toBe(true);
  });
});
