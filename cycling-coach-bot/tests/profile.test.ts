import './setup.js';
import { describe, it, expect } from 'vitest';
import { formatProfile, parseProfileArgs } from '../src/utils/profileArgs.js';
import { getProfile, setProfile, upsertUser } from '../src/db/schema.js';
import { detectIntervals } from '../src/data/streams.js';

describe('parseProfileArgs', () => {
  it('parses numeric fields', () => {
    const r = parseProfileArgs('ftp=285 weight=72.5 maxhr=195');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch).toEqual({ ftp_watts: 285, weight_kg: 72.5, max_hr: 195 });
  });

  it('parses quoted multi-word goal', () => {
    const r = parseProfileArgs('goal="Haute Route GC" ftp=300');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch.goal).toBe('Haute Route GC');
    expect(r.patch.ftp_watts).toBe(300);
  });

  it('rejects out-of-range FTP', () => {
    const r = parseProfileArgs('ftp=9000');
    expect(r.ok).toBe(false);
  });

  it('rejects malformed tokens', () => {
    const r = parseProfileArgs('ftp285');
    expect(r.ok).toBe(false);
  });

  it('rejects unknown keys', () => {
    const r = parseProfileArgs('vo2max=70');
    expect(r.ok).toBe(false);
  });

  it('rejects an empty arg string', () => {
    const r = parseProfileArgs('');
    expect(r.ok).toBe(false);
  });

  it('formatProfile shows W/kg when both FTP and weight set', () => {
    const s = formatProfile({
      ftp_watts: 290,
      weight_kg: 72.5,
      max_hr: 195,
      goal: null,
      updated_at: null,
    });
    expect(s).toContain('W/kg');
    expect(s).toContain('4.00'); // 290/72.5 = 4.00
  });
});

describe('athlete profile DB round-trip', () => {
  it('returns empty profile before any setProfile call', () => {
    const user = upsertUser(999_001);
    const p = getProfile(user.id);
    expect(p).toEqual({
      ftp_watts: null,
      weight_kg: null,
      max_hr: null,
      goal: null,
      updated_at: null,
    });
  });

  it('persists a patch and merges subsequent patches', () => {
    const user = upsertUser(999_002);
    setProfile(user.id, { ftp_watts: 280, weight_kg: 70 });
    setProfile(user.id, { max_hr: 190, goal: 'Transcontinental' });
    const p = getProfile(user.id);
    expect(p.ftp_watts).toBe(280);
    expect(p.weight_kg).toBe(70);
    expect(p.max_hr).toBe(190);
    expect(p.goal).toBe('Transcontinental');
    expect(p.updated_at).toBeGreaterThan(0);
  });
});

describe('detectIntervals honours FTP threshold', () => {
  it('uses ftpWatts * 0.88 instead of top-decile when provided', () => {
    // 5min @ 230W then 3min @ 260W. Top-decile would set threshold near 260
    // and miss the 230W block; FTP=240 -> threshold=211 catches both.
    const watts = [
      ...new Array(300).fill(230),
      ...new Array(180).fill(260),
    ];
    const time = watts.map((_, i) => i);
    const withFtp = detectIntervals(
      { time, watts, heartrate: [], cadence: [] },
      { ftpWatts: 240, minDurationSeconds: 60 }
    );
    // Blocks are contiguous (both above threshold) so they merge into one interval.
    expect(withFtp).toHaveLength(1);
    expect(withFtp[0].duration_s).toBeGreaterThan(400);
  });
});
