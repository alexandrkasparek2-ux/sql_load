import './setup.js';
import { describe, it, expect } from 'vitest';
import {
  detectIntervals,
  mean,
  movingAverage,
  normalisedPower,
  topDecile,
} from '../src/data/streams.js';

function flat(seconds: number, watts: number): number[] {
  return new Array(seconds).fill(watts);
}

describe('streams math', () => {
  it('computes a trailing moving average', () => {
    const out = movingAverage([1, 2, 3, 4, 5], 3);
    // At each position: mean of up to the last 3.
    expect(out[0]).toBe(1);
    expect(out[1]).toBe(1.5);
    expect(out[2]).toBe(2);
    expect(out[3]).toBe(3);
    expect(out[4]).toBe(4);
  });

  it('returns the top-decile value', () => {
    const xs = Array.from({ length: 100 }, (_, i) => i);
    expect(topDecile(xs)).toBe(90);
  });

  it('reports mean', () => {
    expect(mean([2, 4, 6])).toBe(4);
  });

  it('yields null NP for a too-short sample', () => {
    expect(normalisedPower([100, 100, 100])).toBeNull();
  });

  it('NP is close to mean for constant-power blocks', () => {
    const np = normalisedPower(flat(120, 250));
    expect(np).not.toBeNull();
    expect(np!).toBeGreaterThan(245);
    expect(np!).toBeLessThan(255);
  });
});

describe('detectIntervals', () => {
  it('finds three 8-minute efforts separated by recoveries', () => {
    const time: number[] = [];
    const watts: number[] = [];
    const hr: number[] = [];
    let t = 0;
    // 5 min warm-up at 130W
    for (let i = 0; i < 300; i++, t++) {
      time.push(t);
      watts.push(130);
      hr.push(120);
    }
    // 3x (8 min at 320W, 3 min at 150W)
    for (let rep = 0; rep < 3; rep++) {
      for (let i = 0; i < 480; i++, t++) {
        time.push(t);
        watts.push(320);
        hr.push(160);
      }
      for (let i = 0; i < 180; i++, t++) {
        time.push(t);
        watts.push(150);
        hr.push(130);
      }
    }

    const intervals = detectIntervals(
      { time, watts, heartrate: hr, cadence: [] },
      { minDurationSeconds: 120 }
    );
    expect(intervals).toHaveLength(3);
    for (const iv of intervals) {
      expect(iv.duration_s).toBeGreaterThanOrEqual(440); // allow smoothing edge
      expect(iv.avg_watts).toBeGreaterThan(300);
      expect(iv.avg_hr).toBeGreaterThan(150);
    }
  });

  it('returns nothing for a steady endurance ride', () => {
    const watts = flat(1800, 180); // 30 min at 180W
    const time = watts.map((_, i) => i);
    const intervals = detectIntervals(
      { time, watts, heartrate: [], cadence: [] },
      { thresholdWatts: 250, minDurationSeconds: 60 }
    );
    expect(intervals).toEqual([]);
  });

  it('returns [] for too-short streams', () => {
    expect(
      detectIntervals({ time: [0, 1, 2], watts: [100, 100, 100], heartrate: [], cadence: [] })
    ).toEqual([]);
  });
});
