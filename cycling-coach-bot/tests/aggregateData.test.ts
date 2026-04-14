import './setup.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveToken, upsertUser } from '../src/db/schema.js';

// Mock fetch before we import any module that might use it. We only stub
// Strava endpoints here; TP and WHOOP have no tokens so they fall through to
// the graceful-degradation path.
const originalFetch = globalThis.fetch;

describe('aggregateData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns unavailable entries for providers without tokens', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as any;

    const { fetchAllData } = await import('../src/utils/aggregateData.js');
    const user = upsertUser(9001);
    const data = await fetchAllData(user.id);
    expect('unavailable' in data.strava).toBe(true);
    expect('unavailable' in data.trainingpeaks).toBe(true);
    expect('unavailable' in data.whoop).toBe(true);
    expect(data.custom).toBeDefined();
    globalThis.fetch = originalFetch;
  });

  it('aggregates Strava activities when a token exists', async () => {
    const now = Math.floor(Date.now() / 1000);
    globalThis.fetch = vi.fn(async (url: any) => {
      const u = String(url);
      if (u.includes('/athlete/activities')) {
        return new Response(
          JSON.stringify([
            {
              id: 1,
              name: 'Morning ride',
              start_date: '2025-01-01T10:00:00Z',
              distance: 30000, // 30 km
              moving_time: 3600,
              average_watts: 200,
              average_heartrate: 140,
              type: 'Ride',
            },
            {
              id: 2,
              name: 'Evening ride',
              start_date: '2025-01-01T18:00:00Z',
              distance: 20000, // 20 km
              moving_time: 1800,
              average_watts: 180,
              average_heartrate: 130,
              type: 'Ride',
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      // Everything else (custom dashboard probes, TP, WHOOP): 404-equivalent.
      return new Response('', { status: 404 });
    }) as any;

    const user = upsertUser(9002);
    saveToken({
      user_id: user.id,
      provider: 'strava',
      access_token: 'valid',
      refresh_token: 'ref',
      expires_at: now + 3600,
      extra_json: null,
    });

    vi.resetModules();
    const { fetchAllData } = await import('../src/utils/aggregateData.js');
    const data = await fetchAllData(user.id);
    expect('unavailable' in data.strava).toBe(false);
    if (!('unavailable' in data.strava)) {
      expect(data.strava.last_7_days).toHaveLength(2);
      expect(data.strava.total_distance_km).toBe(50);
      expect(data.strava.avg_power).toBe(190);
      expect(data.strava.avg_heartrate).toBe(135);
    }
    globalThis.fetch = originalFetch;
  });
});
