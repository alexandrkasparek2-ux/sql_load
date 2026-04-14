import { getValidAccessToken } from '../utils/auth.js';
import { withRetry } from '../utils/retry.js';

/**
 * Strava activity streams + interval detection.
 *
 * Strava's /activities/{id}/streams returns time-indexed arrays for
 * "time", "watts", "heartrate", "cadence", etc. We pull the relevant ones
 * and then run a simple moving-average detector that finds contiguous
 * "effort" windows: stretches where power stays above a user-specific
 * threshold for at least N seconds.
 */

export interface StreamSet {
  time: number[]; // seconds since start
  watts: number[];
  heartrate: number[];
  cadence: number[];
}

export interface Interval {
  start_s: number;
  end_s: number;
  duration_s: number;
  avg_watts: number;
  avg_hr: number | null;
  normalised_watts: number | null;
}

export async function getActivityStreams(
  userId: number,
  activityId: number
): Promise<StreamSet> {
  const token = await getValidAccessToken(userId, 'strava');
  const url =
    `https://www.strava.com/api/v3/activities/${activityId}/streams` +
    `?keys=time,watts,heartrate,cadence&key_by_type=true`;
  const data = await withRetry(
    async () => {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`Strava streams ${r.status}`);
      return (await r.json()) as Record<string, { data: number[] }>;
    },
    { label: 'strava-streams' }
  );
  return {
    time: data.time?.data ?? [],
    watts: data.watts?.data ?? [],
    heartrate: data.heartrate?.data ?? [],
    cadence: data.cadence?.data ?? [],
  };
}

/**
 * Detect effort intervals. Threshold defaults to 85% of the top-decile power
 * seen in the ride (a rough proxy for "the athlete meant to go hard here")
 * so it works without requiring FTP to be configured.
 */
export function detectIntervals(
  streams: StreamSet,
  opts: {
    thresholdWatts?: number;
    minDurationSeconds?: number;
    smoothingWindow?: number;
  } = {}
): Interval[] {
  const watts = streams.watts;
  if (watts.length < 30) return [];

  const threshold =
    opts.thresholdWatts ?? Math.round(topDecile(watts) * 0.85);
  const minDuration = opts.minDurationSeconds ?? 45;
  const smoothing = opts.smoothingWindow ?? 10;

  const smoothed = movingAverage(watts, smoothing);
  const intervals: Interval[] = [];

  let startIdx: number | null = null;
  for (let i = 0; i < smoothed.length; i++) {
    const above = smoothed[i] >= threshold;
    if (above && startIdx === null) {
      startIdx = i;
    } else if (!above && startIdx !== null) {
      pushInterval(intervals, streams, startIdx, i - 1, minDuration);
      startIdx = null;
    }
  }
  if (startIdx !== null) {
    pushInterval(intervals, streams, startIdx, smoothed.length - 1, minDuration);
  }
  return intervals;
}

function pushInterval(
  out: Interval[],
  streams: StreamSet,
  startIdx: number,
  endIdx: number,
  minDuration: number
): void {
  const startS = streams.time[startIdx] ?? startIdx;
  const endS = streams.time[endIdx] ?? endIdx;
  const duration = endS - startS;
  if (duration < minDuration) return;

  const slice = streams.watts.slice(startIdx, endIdx + 1);
  const hrSlice = streams.heartrate.slice(startIdx, endIdx + 1);
  const avg = mean(slice);
  out.push({
    start_s: startS,
    end_s: endS,
    duration_s: duration,
    avg_watts: Math.round(avg),
    avg_hr: hrSlice.length ? Math.round(mean(hrSlice)) : null,
    normalised_watts: normalisedPower(slice),
  });
}

export function movingAverage(xs: number[], window: number): number[] {
  if (window <= 1) return xs.slice();
  const out: number[] = new Array(xs.length);
  let sum = 0;
  for (let i = 0; i < xs.length; i++) {
    sum += xs[i];
    if (i >= window) sum -= xs[i - window];
    out[i] = sum / Math.min(i + 1, window);
  }
  return out;
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/**
 * Top-decile power value — used as a threshold anchor without needing FTP.
 * For a well-structured interval workout this approximates the effort target.
 */
export function topDecile(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = xs.slice().sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.9);
  return sorted[idx];
}

/**
 * Normalised Power (30s rolling avg, raised to 4, mean, 4th root). See
 * Coggan's definition. Returns null if sample is too short.
 */
export function normalisedPower(watts: number[]): number | null {
  if (watts.length < 30) return null;
  const rolling = movingAverage(watts, 30);
  let s = 0;
  for (const v of rolling) s += v ** 4;
  return Math.round(Math.pow(s / rolling.length, 0.25));
}
