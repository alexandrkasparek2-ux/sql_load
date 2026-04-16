// ─── Apple HealthKit Web API wrapper ─────────────────────────────────────────
// Available in Safari on iOS 17.4+ for PWAs added to Home Screen.
// Spec: https://webkit.org/blog/14785/webkit-features-in-safari-17-4/

// Type declarations (not in @types yet)
declare global {
  interface Window {
    HealthKit?: AppleHealthKitJS;
  }
}

interface AppleHealthKitJS {
  requestAuthorization(opts: { read: string[] }): Promise<void>;
  executeActivitySummaryQuery(opts: {
    startDate: string; endDate: string;
  }): Promise<HKActivitySummaryResult[]>;
  executeQuantitySampleQuery(opts: {
    quantityType: string; startDate: string; endDate: string; limit?: number;
  }): Promise<HKSample[]>;
  executeSleepAnalysisQuery(opts: {
    startDate: string; endDate: string;
  }): Promise<HKSleepSample[]>;
}

interface HKActivitySummaryResult {
  activeEnergyBurned:         number; // kcal
  activeEnergyBurnedGoal:     number;
  appleExerciseTime:          number; // minutes
  appleExerciseTimeGoal:      number;
  appleStandHours:            number;
  appleStandHoursGoal:        number;
}

interface HKSample {
  startDate:     string;
  endDate:       string;
  quantity:      number;
  quantityUnit:  string;
}

interface HKSleepSample {
  startDate:  string;
  endDate:    string;
  value:      string; // 'ASLEEP' | 'AWAKE' | 'IN_BED' | 'CORE' | 'DEEP' | 'REM'
}

// ── Feature detection ─────────────────────────────────────────
export function isAppleHealthAvailable(): boolean {
  return typeof window !== 'undefined' && 'HealthKit' in window;
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// ── Data types ────────────────────────────────────────────────
export interface AppleHealthData {
  activeKcal:     number | null;
  kcalGoal:       number | null;
  exerciseMins:   number | null;
  exerciseGoal:   number | null;
  standHours:     number | null;
  restingHR:      number | null;
  sleepHours:     number | null;
  fetchedAt:      string;
}

const CACHE_KEY = 'cyclofuel_apple_health_cache';

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function todayEnd(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
function yesterdayStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(18, 0, 0, 0); // last night 18:00
  return d.toISOString();
}

// ── Authorization ─────────────────────────────────────────────
export async function requestAppleHealthAuth(): Promise<void> {
  if (!window.HealthKit) throw new Error('HealthKit not available');
  await window.HealthKit.requestAuthorization({
    read: [
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      'HKQuantityTypeIdentifierRestingHeartRate',
      'HKQuantityTypeIdentifierHeartRate',
      'HKCategoryTypeIdentifierSleepAnalysis',
      'HKActivitySummaryType',
    ],
  });
}

// ── Fetch today's data ────────────────────────────────────────
export async function fetchAppleHealthData(): Promise<AppleHealthData> {
  if (!window.HealthKit) throw new Error('HealthKit not available');

  const hk = window.HealthKit;
  const start = todayStart();
  const end   = todayEnd();

  const [activityArr, rhrArr, sleepArr] = await Promise.allSettled([
    hk.executeActivitySummaryQuery({ startDate: start, endDate: end }),
    hk.executeQuantitySampleQuery({
      quantityType: 'HKQuantityTypeIdentifierRestingHeartRate',
      startDate: start, endDate: end, limit: 1,
    }),
    hk.executeSleepAnalysisQuery({ startDate: yesterdayStart(), endDate: end }),
  ]);

  const activity = activityArr.status === 'fulfilled' ? activityArr.value[0] ?? null : null;
  const rhrSamples = rhrArr.status === 'fulfilled' ? rhrArr.value : [];
  const sleepSamples = sleepArr.status === 'fulfilled' ? sleepArr.value : [];

  // Sum asleep minutes
  const sleepMs = sleepSamples
    .filter(s => ['ASLEEP', 'CORE', 'DEEP', 'REM'].includes(s.value))
    .reduce((sum, s) => {
      return sum + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime());
    }, 0);

  const data: AppleHealthData = {
    activeKcal:   activity?.activeEnergyBurned   ?? null,
    kcalGoal:     activity?.activeEnergyBurnedGoal ?? null,
    exerciseMins: activity?.appleExerciseTime    ?? null,
    exerciseGoal: activity?.appleExerciseTimeGoal ?? null,
    standHours:   activity?.appleStandHours      ?? null,
    restingHR:    rhrSamples[0]?.quantity        ?? null,
    sleepHours:   sleepMs > 0 ? parseFloat((sleepMs / 3_600_000).toFixed(1)) : null,
    fetchedAt:    new Date().toISOString(),
  };

  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  return data;
}

export function loadAppleHealthCache(): (AppleHealthData & { cachedAt?: number }) | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearAppleHealthCache() {
  localStorage.removeItem(CACHE_KEY);
}
