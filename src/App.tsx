import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  BrowserRouter, Routes, Route, NavLink, useNavigate, Navigate, useLocation,
} from 'react-router-dom';

import { useAuth }        from './hooks/useAuth';
import { useProfile }     from './hooks/useProfile';
import { useTrainingDay } from './hooks/useTrainingDay';
import { useFoodEntries } from './hooks/useFoodEntries';
import { useDailyGoals }  from './hooks/useDailyGoals';
import { useDailyNutritionSnapshot } from './hooks/useDailyNutritionSnapshot';
import { useBackfillSnapshots } from './hooks/useBackfillSnapshots';
import { loadBurnLog } from './services/intervalsService';
import { useNotifications } from './hooks/useNotifications';
import { useUserSetting } from './hooks/useUserSetting';

import type { Profile as ProfileData } from './hooks/useProfile';
import type { TrainingDay } from './hooks/useTrainingDay';
import type { FoodEntry, MacroTotals } from './hooks/useFoodEntries';

import {
  TRAINING_TYPES,
  calcCaloriesMulti, calcCalories, calcMacros, calcWater, calcMicroGoals,
  type TrainingType,
} from './constants/training';
import { APP_NAV_ITEMS, getActiveNavItem } from './constants/navigation';

import Login           from './pages/Login';
import Dashboard       from './pages/Dashboard';
import Foods           from './pages/Foods';
import Micros          from './pages/Micros';
import Plan            from './pages/Plan';
import Profile         from './pages/Profile';
import Supplements     from './pages/Supplements';
import Chat            from './pages/Chat';
import WhoopCallback   from './pages/WhoopCallback';
import StravaCallback  from './pages/StravaCallback';

import { T, Spinner } from './components/UI';
import { clearTPCache, TP_FORCE_SYNC_EVENT } from './services/trainingPeaksService';
import { ToastHost }     from './components/Toast';
import FloatingChat      from './components/FloatingChat';

// ──────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────
export interface Goals {
  kcal:    number;
  carbs:   number;
  protein: number;
  fat:     number;
  fiber:   number;
  water:   number;
  micros:  Record<string, number>;
}

export type DeficitLevel = 'off' | 'slow' | 'medium' | 'fast';
export const DEFICIT_KCAL: Record<DeficitLevel, number> = {
  off: 0, slow: 250, medium: 500, fast: 750,
};

export interface AppCtx {
  userId:            string;
  today:             string;
  setToday:          (date: string) => void;
  accent:            string;
  accentGlow:        string;
  profile:           ProfileData | null;
  saveProfile:       (u: Partial<Omit<ProfileData, 'id'>>) => Promise<void>;
  trainingDay:       TrainingDay | null;
  upsertTrainingDay: (u: Partial<TrainingDay>) => Promise<void>;
  entries:           FoodEntry[];
  totals:            MacroTotals;
  goals:             Goals;
  goalOverride:      Partial<Goals> | null;
  setGoalOverride:   (o: Partial<Goals> | null) => void;
  addEntry:          (e: Omit<FoodEntry, 'id'>) => Promise<FoodEntry | null>;
  removeEntry:       (id: string) => Promise<void>;
  updateEntry:       (id: string, newGrams: number, newMealSlot?: string) => Promise<void>;
  updateEntryMacros: (id: string, macros: { kcal: number; carbs: number; protein: number; fat: number }, newMealSlot?: string) => Promise<void>;
  signOut:           () => Promise<void>;
  deficitLevel:      DeficitLevel;
  setDeficitLevel:   (v: DeficitLevel) => void;
  /** Whether the currently viewed date has a frozen historical snapshot. */
  isHistoricalDay:   boolean;
  /** Clear snapshot for current date so it gets live-recalculated and re-saved. */
  recalculateDay:    () => Promise<void>;
  /** Total energy expenditure for today (BMR + activity), before deficit reduction. */
  burnedToday:       number;
}

const DEFAULT_GOALS: Goals = {
  kcal: 2000, carbs: 250, protein: 130, fat: 70, fiber: 30, water: 2.5,
  micros: {},
};

export const AppContext = createContext<AppCtx>({} as AppCtx);
export const useApp     = () => useContext(AppContext);

// ──────────────────────────────────────────────────────────
// Today helper
// ──────────────────────────────────────────────────────────
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatLocalISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function kcalFromActivity(a: {
  calories?: number | null;
  icu_joules?: number | null;
  icu_average_watts?: number | null;
  icu_intensity?: number | null;
  icu_ftp?: number | null;
  trimp?: number | null;
  moving_time?: number;
}): number {
  const t = a.moving_time ?? 0;
  if (a.calories && a.calories > 0) return Math.round(a.calories);
  if (a.icu_joules && a.icu_joules > 0) return Math.round(a.icu_joules / 1000);
  if (a.icu_average_watts && a.icu_average_watts > 0 && t > 0)
    return Math.round(a.icu_average_watts * t / 1000);
  if (a.icu_ftp && a.icu_ftp > 0 && a.icu_intensity && a.icu_intensity > 0 && t > 0)
    return Math.round((a.icu_intensity / 100) * a.icu_ftp * t / 1000);
  if (a.trimp && a.trimp > 0) return Math.round(a.trimp * 8);
  return 0;
}

function activityTypeToTraining(type: string | null | undefined, intensityPct: number): TrainingType {
  const t = (type ?? '').toLowerCase();
  if (t.includes('strength') || t.includes('workout') || t.includes('weight') || t.includes('crossfit')) return 'strength';
  if (t.includes('run') || t.includes('jog') || t.includes('trail')) return 'running';
  if (t.includes('swim')) return 'swimming';
  if (t.includes('walk')) return 'walking';
  if (t.includes('hike')) return 'hiking';
  if (t.includes('ski') || t.includes('snow')) return 'skiing';
  if (t.includes('yoga') || t.includes('stretch')) return 'yoga';
  // cycling / ride / virtual / default → intensity-based
  if (intensityPct >= 88) return 'race';
  if (intensityPct >= 73) return 'hard';
  if (intensityPct >= 56) return 'medium';
  return 'light';
}

interface IntervalsDataToday {
  kcal:  number;
  type:  TrainingType;
  hours: number;
}

function readIntervalsDataToday(today: string): IntervalsDataToday {
  try {
    const raw = localStorage.getItem('cyclofuel_intervals_cache');
    if (!raw) return { kcal: 0, type: 'rest', hours: 0 };
    const cache = JSON.parse(raw);
    const acts = (cache.activities ?? []).filter(
      (a: { start_date_local: string }) => a.start_date_local.startsWith(today)
    );
    if (acts.length === 0) return { kcal: 0, type: 'rest', hours: 0 };

    const kcal  = acts.reduce((s: number, a: Parameters<typeof kcalFromActivity>[0]) => s + kcalFromActivity(a), 0);
    const hours = acts.reduce((s: number, a: { moving_time?: number }) => s + (a.moving_time ?? 0) / 3600, 0);

    // Weighted average intensity across activities (by duration)
    const totalTime = acts.reduce((s: number, a: { moving_time?: number }) => s + (a.moving_time ?? 0), 0);
    const avgIntensity = totalTime > 0
      ? acts.reduce((s: number, a: { icu_intensity?: number | null; moving_time?: number }) =>
          s + (a.icu_intensity ?? 0) * (a.moving_time ?? 0), 0) / totalTime
      : 0;

    // Pick dominant type by longest activity
    const dominant = acts.reduce((best: { moving_time?: number; type?: string | null }, a: { moving_time?: number }) =>
      (a.moving_time ?? 0) > (best.moving_time ?? 0) ? a : best, acts[0]);

    const type = activityTypeToTraining(dominant.type, avgIntensity);
    return { kcal, type, hours };
  } catch { return { kcal: 0, type: 'rest', hours: 0 }; }
}


// ──────────────────────────────────────────────────────────
// Authenticated shell
// ──────────────────────────────────────────────────────────
interface AuthShellProps {
  userId:    string;
  onSignOut: () => Promise<void>;
}

function AuthShell({ userId, onSignOut }: AuthShellProps) {
  const [today, setTodayState] = useState(() => {
    const actual = todayISO();
    try {
      const stored = sessionStorage.getItem('cyclofuel_date');
      if (stored) {
        const diff = (new Date(actual).getTime() - new Date(stored).getTime()) / 86_400_000;
        if (diff >= 0 && diff <= 7) return stored;
      }
    } catch { /* ignore */ }
    return actual;
  });
  const setToday = (d: string) => {
    try { sessionStorage.setItem('cyclofuel_date', d); } catch { /* ignore */ }
    setTodayState(d);
  };

  const { profile,     save: saveProfile    } = useProfile(userId);
  const { trainingDay, upsert              } = useTrainingDay(userId, today);
  const { entries, totals, addEntry, removeEntry, updateEntry, updateEntryMacros } = useFoodEntries(userId, today);

  const { value: deficitLevel, setValue: setStoredDeficitLevel } = useUserSetting<DeficitLevel>(
    userId,
    'deficit_level',
    'off',
    { legacyKey: `cyclofuel_deficit_level_${userId}` },
  );

  const setDeficitLevel = (v: DeficitLevel) => {
    void setStoredDeficitLevel(v);
  };

  const { value: targetWeightSetting } = useUserSetting<number>(
    userId,
    'target_weight',
    profile?.weight ?? 0,
    { legacyKey: `cyclofuel_target_weight_${userId}` },
  );

  const trainingType = trainingDay?.training_type ?? 'rest';
  const rideHours    = trainingDay?.ride_hours    ?? 0;
  const training     = TRAINING_TYPES.find(t => t.id === trainingType)!;

  const deficitKcal = useMemo(() => {
    if (!profile) return 0;
    const targetW = targetWeightSetting > 0 ? targetWeightSetting : profile.weight;
    return deficitLevel !== 'off' && targetW < profile.weight ? DEFICIT_KCAL[deficitLevel] : 0;
  }, [profile, deficitLevel, targetWeightSetting]);;

  const goals = useMemo<Goals>(() => {
    if (!profile) return DEFAULT_GOALS;
    const m      = calcMacros(profile, trainingType);
    const types  = (trainingDay?.extra_types ?? []).length > 0
      ? (trainingDay!.extra_types as typeof trainingType[])
      : [trainingType];
    const kcalGoal = calcCaloriesMulti(
      profile, types,
      trainingDay?.activity_hours     ?? {},
      trainingDay?.activity_intensity ?? {},
    );

    const kcalFinal = Math.max(1200, kcalGoal - deficitKcal);

    // Scale macros proportionally to fit within kcalFinal
    const rawMacroKcal = m.carbs * 4 + m.protein * 4 + m.fat * 9;
    let { carbs, protein, fat } = m;
    if (rawMacroKcal > kcalFinal && rawMacroKcal > 0) {
      const scale = kcalFinal / rawMacroKcal;
      carbs   = Math.round(m.carbs   * scale);
      protein = Math.round(m.protein * scale);
      fat     = Math.round(m.fat     * scale);
    }

    // Vláknina: ~14 g / 1 000 kcal, min 25 g, max 45 g
    const fiberGoal = Math.min(45, Math.max(25, Math.round(kcalFinal * 0.014)));
    return {
      kcal:    kcalFinal,
      carbs,
      protein,
      fat,
      fiber:   fiberGoal,
      water:   calcWater(profile, rideHours),
      micros:  calcMicroGoals(training.microMul),
    };
  }, [profile, trainingType, rideHours, training.microMul, trainingDay, deficitKcal]);

  // ── Intervals.icu: přepočet kalorií + maker podle skutečné aktivity ──
  const [intervalsData, setIntervalsData] = useState(
    () => readIntervalsDataToday(today),
  );
  useEffect(() => {
    const refresh = () => setIntervalsData(readIntervalsDataToday(today));
    refresh();
    window.addEventListener('intervals-cache-updated', refresh);
    return () => window.removeEventListener('intervals-cache-updated', refresh);
  }, [today]);

  const goalsWithIntervals = useMemo<Goals>(() => {
    if (!intervalsData.kcal || !profile) return goals;
    const { kcal: actKcal, type: actType, hours: actHours } = intervalsData;
    // Total: BMR (rest) + actual activity kcal from Intervals, then apply deficit
    const baseBMR    = calcCalories(profile, 'rest', 0);
    const kcalRaw    = Math.round(baseBMR + actKcal);
    const kcalNew    = Math.max(1200, kcalRaw - deficitKcal);
    const fiberNew   = Math.min(45, Math.max(25, Math.round(kcalNew * 0.014)));
    const m          = calcMacros(profile, actType);
    const waterNew   = calcWater(profile, actHours);
    // Scale macros to fit kcalNew
    const rawMacroKcal = m.carbs * 4 + m.protein * 4 + m.fat * 9;
    let { carbs, protein, fat } = m;
    if (rawMacroKcal > kcalNew && rawMacroKcal > 0) {
      const scale = kcalNew / rawMacroKcal;
      carbs   = Math.round(m.carbs   * scale);
      protein = Math.round(m.protein * scale);
      fat     = Math.round(m.fat     * scale);
    }
    return { ...goals, kcal: kcalNew, fiber: fiberNew, carbs, protein, fat, water: waterNew };
  }, [goals, intervalsData, profile, deficitKcal]);

  // Total energy expenditure (BMR + activity), before deficit reduction.
  // Used by UI to display true energy balance = burnedToday - consumed.
  const burnedToday = useMemo(() => {
    if (!profile) return 0;
    if (intervalsData.kcal > 0) {
      return Math.round(calcCalories(profile, 'rest', 0) + intervalsData.kcal);
    }
    const types = (trainingDay?.extra_types ?? []).length > 0
      ? (trainingDay!.extra_types as TrainingType[])
      : [trainingType];
    return Math.round(calcCaloriesMulti(
      profile, types,
      trainingDay?.activity_hours     ?? {},
      trainingDay?.activity_intensity ?? {},
    ));
  }, [profile, intervalsData.kcal, trainingType, trainingDay]);

  // ── Daily nutrition snapshot ──────────────────────────────────────────────
  const realToday = useMemo(() => new Date().toISOString().split('T')[0], []);
  const isViewingToday = today === realToday;

  const {
    snapshot,
    isHistoricalSnapshot,
    saveSnapshot,
    clearSnapshot,
  } = useDailyNutritionSnapshot(userId, today);

  // Backfill snapshots for the last 7 days that don't have one yet
  useBackfillSnapshots(userId, profile, deficitKcal);

  // For historical days that have a frozen snapshot, override computed goals
  // so the UI shows the exact values from that day rather than a recalculation.
  const goalsFromSnapshot = useMemo<Goals | null>(() => {
    if (isViewingToday || !snapshot) return null;
    return {
      ...goalsWithIntervals, // keep micros, non-snapshotted fields
      kcal:    snapshot.goal_kcal,
      carbs:   snapshot.goal_carbs,
      protein: snapshot.goal_protein,
      fat:     snapshot.goal_fat,
      water:   snapshot.goal_water,
      fiber:   snapshot.goal_fiber,
    };
  }, [isViewingToday, snapshot, goalsWithIntervals]);

  const baseGoals = goalsFromSnapshot ?? goalsWithIntervals;

  // For historical days, restore burned from Intervals burnLog or snapshot so
  // VÝDEJ doesn't revert to the rest-day BMR when the live cache expires.
  const effectiveBurnedToday = useMemo(() => {
    if (!isViewingToday && profile) {
      const burnLog = loadBurnLog();
      if (typeof burnLog[today] === 'number') {
        return Math.round(calcCalories(profile, 'rest', 0) + burnLog[today]);
      }
      if (snapshot && snapshot.deficit_kcal >= 0) {
        return snapshot.goal_kcal + snapshot.deficit_kcal;
      }
    }
    return burnedToday;
  }, [isViewingToday, today, profile, snapshot, burnedToday]);

  // ── Chat goal override (set by AI chat for current day) ──
  const overrideKey = `cyclofuel_goal_override_${userId}_${today}`;
  const [goalOverride, setGoalOverrideState] = useState<Partial<Goals> | null>(() => {
    try { return JSON.parse(localStorage.getItem(overrideKey) ?? 'null'); }
    catch { return null; }
  });
  const setGoalOverride = useCallback((o: Partial<Goals> | null) => {
    setGoalOverrideState(o);
    if (o) localStorage.setItem(overrideKey, JSON.stringify(o));
    else   localStorage.removeItem(overrideKey);
  }, [overrideKey]);

  // Re-read override when date changes
  useEffect(() => {
    try { setGoalOverrideState(JSON.parse(localStorage.getItem(overrideKey) ?? 'null')); }
    catch { setGoalOverrideState(null); }
  }, [overrideKey]);

  const effectiveGoals: Goals = goalOverride
    ? { ...baseGoals, ...goalOverride }
    : baseGoals;

  // ── Auto-save snapshot for today on data changes (debounced 3 s) ──────────
  const { saveGoalForDate } = useDailyGoals(userId);
  useEffect(() => {
    if (!isViewingToday || effectiveGoals.kcal === 0) return;
    // Legacy kcal-only store (keeps useWeeklyData fallback working)
    saveGoalForDate(today, effectiveGoals.kcal);
  }, [isViewingToday, today, effectiveGoals.kcal, saveGoalForDate]);

  useEffect(() => {
    if (!isViewingToday || effectiveGoals.kcal === 0) return;
    const timer = setTimeout(() => {
      void saveSnapshot({
        consumed_kcal:    totals.kcal,
        consumed_carbs:   totals.carbs,
        consumed_protein: totals.protein,
        consumed_fat:     totals.fat,
        consumed_fiber:   totals.fiber,
        goal_kcal:        effectiveGoals.kcal,
        goal_carbs:       effectiveGoals.carbs,
        goal_protein:     effectiveGoals.protein,
        goal_fat:         effectiveGoals.fat,
        goal_water:       effectiveGoals.water,
        goal_fiber:       effectiveGoals.fiber,
        activity_kcal:    intervalsData.kcal,
        activity_source:  intervalsData.kcal > 0 ? 'intervals' : 'none',
        deficit_kcal:     Math.max(0, effectiveGoals.kcal - totals.kcal),
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [isViewingToday, effectiveGoals, totals, intervalsData.kcal, saveSnapshot]);

  // ── Recalculate historical day ─────────────────────────────────────────────
  const recalculateDay = useCallback(async () => {
    await clearSnapshot();
    // After clearing, goalsFromSnapshot becomes null → live calculation kicks in.
    // Then the user can save manually or it saves on next today visit.
  }, [clearSnapshot]);

  const ctx: AppCtx = {
    userId,
    today,
    setToday,
    accent:            training.color,
    accentGlow:        training.glow,
    profile,
    saveProfile,
    trainingDay,
    upsertTrainingDay: upsert,
    entries,
    totals,
    goals: effectiveGoals,
    goalOverride,
    setGoalOverride,
    addEntry,
    removeEntry,
    updateEntry,
    updateEntryMacros,
    signOut:           onSignOut,
    deficitLevel,
    setDeficitLevel,
    isHistoricalDay:   isHistoricalSnapshot,
    recalculateDay,
    burnedToday:       effectiveBurnedToday,
  };

  // Push notifications (runs checks every 5 min when permission granted)
  useNotifications({
    totals:      { kcal: totals.kcal, protein: totals.protein },
    goals:       { kcal: effectiveGoals.kcal, water: effectiveGoals.water, protein: effectiveGoals.protein },
    waterGlasses: trainingDay?.water_glasses ?? 0,
    intervalsActivitiesJson: (() => {
      try {
        const cache = localStorage.getItem('cyclofuel_intervals_cache');
        if (!cache) return '';
        const parsed = JSON.parse(cache) as { activities?: unknown[] };
        return JSON.stringify(parsed.activities ?? []);
      } catch { return ''; }
    })(),
  });

  return (
    <AppContext.Provider value={ctx}>
      <AppLayout today={today} setToday={setToday} />
    </AppContext.Provider>
  );
}

// ──────────────────────────────────────────────────────────
// Nav SVG icons
// ──────────────────────────────────────────────────────────
const NavIcons: Record<string, React.ReactNode> = {
  '/': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  '/foods': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  ),
  '/chat': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  '/plan': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  '/supplements': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/><circle cx="18" cy="18" r="3"/><path d="m22 22-1.5-1.5"/>
    </svg>
  ),
  '/profile': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
};

interface AppLayoutProps {
  today:    string;
  setToday: (date: string) => void;
}

function AppLayout({ today, setToday }: AppLayoutProps) {
  const location = useLocation();
  const realToday = todayISO();
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1280;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(min-width: 1280px)');
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  // Human-friendly date label
  const dateLabel = (() => {
    const d         = new Date(today + 'T00:00:00');
    const dateShort = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });

    if (today === realToday) return `Dnes · ${dateShort}`;

    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    if (today === formatLocalISODate(yest)) return `Včera · ${dateShort}`;

    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    if (today === formatLocalISODate(tom)) return `Zítra · ${dateShort}`;

    const dayShort = d.toLocaleDateString('cs-CZ', { weekday: 'short' });
    return `${dayShort} ${dateShort}`;
  })();

  const prevDay = () => {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setToday(formatLocalISODate(d));
  };

  const nextDay = () => {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setToday(formatLocalISODate(d));
  };

  const isToday = today === realToday;

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = useCallback(() => {
    if (isSyncing) return;
    clearTPCache();
    window.dispatchEvent(new CustomEvent(TP_FORCE_SYNC_EVENT));
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  }, [isSyncing]);

  // Topbar date string: "Neděle · 19. 4."
  const topbarDate = (() => {
    const d = new Date(today + 'T00:00:00');
    const weekday   = d.toLocaleDateString('cs-CZ', { weekday: 'long' });
    const dateShort = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} · ${dateShort}`;
  })();

  const activeNav = getActiveNavItem(location.pathname);
  const pageTitle = activeNav.subtitle;
  const isChatPage = location.pathname.startsWith('/chat');

  const routes = (
    <Routes>
      <Route path="/"                element={<Dashboard />}     />
      <Route path="/foods"           element={<Foods />}         />
      <Route path="/chat"            element={<Chat />}          />
      <Route path="/plan"            element={<Plan />}          />
      <Route path="/supplements"     element={<Supplements />}   />
      <Route path="/micros"          element={<Micros />}        />
      <Route path="/profile"         element={<Profile />}       />
      <Route path="/whoop/callback"  element={<WhoopCallback />}  />
      <Route path="/strava/callback" element={<StravaCallback />} />
      <Route path="*"                element={<Navigate to="/" replace />} />
    </Routes>
  );

  if (isDesktop) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at top left, rgba(255,214,0,0.08), transparent 28%), radial-gradient(circle at top right, rgba(255,107,53,0.08), transparent 24%), #050505',
      }}>
        <header style={{
          flexShrink: 0,
          borderBottom: `1px solid ${T.border}`,
          background: 'rgba(5,5,5,0.78)',
          backdropFilter: 'blur(18px)',
        }}>
          <div style={{
            maxWidth: 1460,
            margin: '0 auto',
            padding: '18px 22px 14px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: '#ff5b1f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  fontSize: 20,
                }}>
                  🚴
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.muted, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4 }}>
                    {topbarDate}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.04em' }}>
                    {pageTitle}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 6,
                  borderRadius: 16,
                  border: `1px solid ${T.border}`,
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <button
                    type="button"
                    onClick={prevDay}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: 'transparent',
                      border: 'none',
                      color: T.muted,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Předchozí den"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>

                  <div style={{
                    position: 'relative',
                    minWidth: 172,
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{
                      fontSize: 14,
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? 'var(--accent-2)' : T.text,
                    }}>
                      {dateLabel}
                    </span>
                    <input
                      type="date"
                      value={today}
                      onChange={e => e.target.value && setToday(e.target.value)}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={nextDay}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: 'transparent',
                      border: 'none',
                      color: T.muted,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Následující den"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 14,
                  border: '1px solid rgba(0,229,176,0.22)',
                  background: 'rgba(0,229,176,0.08)',
                  color: '#00E5B0',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}>
                  <div style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#00E5B0',
                    animation: 'pulse 2s infinite',
                  }} />
                  Sync
                </div>
              </div>
            </div>

            <nav style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, overflowX: 'auto', paddingBottom: 2 }}>
              {APP_NAV_ITEMS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  style={{ textDecoration: 'none' }}
                >
                  {({ isActive }) => (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      borderRadius: 999,
                      border: `1px solid ${isActive ? 'rgba(255,91,31,0.3)' : T.border}`,
                      background: isActive
                        ? 'rgba(255,91,31,0.12)'
                        : 'rgba(255,255,255,0.02)',
                      color: isActive ? '#ff5b1f' : '#9a9a9a',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{ display: 'flex', color: 'inherit' }}>{NavIcons[item.to]}</span>
                      <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 600, letterSpacing: '0.02em' }}>
                        {item.shortLabel}
                      </span>
                    </div>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>
        <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: isChatPage ? 0 : 22 }}>
          <div style={{
            width: '100%',
            maxWidth: isChatPage ? 'none' : 1460,
            margin: '0 auto',
            paddingBottom: isChatPage ? 0 : 22,
            minHeight: '100%',
          }}>
            {routes}
          </div>
        </main>

        <ToastHost />
        <FloatingChat />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: T.bg }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: T.bg, zIndex: 50 }}>

        {/* Řádek 1: Topbar */}
        <div style={{
          padding:        '12px 16px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          borderBottom:   `1px solid ${T.border}`,
        }}>
          <div>
            <div style={{
              fontSize: 11, color: T.muted, letterSpacing: '1px',
              textTransform: 'uppercase' as const, marginBottom: 2,
            }}>
              {topbarDate}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: '-0.3px' }}>
              CycloFuel
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* SYNC button — clears TP cache and forces re-fetch */}
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px',
                background: isSyncing ? 'rgba(0, 229, 176, 0.18)' : 'rgba(0, 229, 176, 0.1)',
                border: '1px solid rgba(0, 229, 176, 0.3)',
                borderRadius: 6,
                fontSize: 9, fontWeight: 700, color: '#00E5B0',
                letterSpacing: '1px', textTransform: 'uppercase' as const,
                cursor: isSyncing ? 'default' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
              aria-label="Synchronizovat TrainingPeaks"
            >
              {isSyncing
                ? <Spinner color="#00E5B0" size={8} />
                : <div style={{ width: 6, height: 6, background: '#00E5B0', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
              }
              Sync
            </button>
            {/* Avatar */}
            <div style={{
              width: 38, height: 38,
              background: '#ff5b1f',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: '#000',
              flexShrink: 0,
            }}>
              🚴
            </div>
          </div>
        </div>

        {/* Řádek 2: Datum navigace */}
        <div style={{
          display: 'flex', alignItems: 'stretch',
          borderBottom: `1px solid ${T.border}`, height: 44,
        }}>
          <button
            type="button" onClick={prevDay}
            style={{
              flex: '0 0 56px', background: 'none', border: 'none',
              borderRight: `1px solid ${T.border}`, color: T.muted,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none',
            }}
            aria-label="Předchozí den"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div style={{
            flex: 1, position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: 14, fontWeight: isToday ? 700 : 400,
              color: isToday ? 'var(--accent-2)' : T.muted, transition: 'color 0.2s',
              pointerEvents: 'none',
            }}>
              {dateLabel}
            </span>
            <input
              type="date" value={today}
              onChange={e => e.target.value && setToday(e.target.value)}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            />
          </div>

          <button
            type="button" onClick={nextDay}
            style={{
              flex: '0 0 56px', background: 'none', border: 'none',
              borderLeft: `1px solid ${T.border}`, color: T.muted,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none',
            }}
            aria-label="Následující den"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Page content */}
      <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 80 }}>
        {routes}
      </main>

      {/* Toast notifications */}
      <ToastHost />

      {/* Floating AI chat bubble (hidden on /chat page) */}
      <FloatingChat />

      {/* Fixed Bottom Nav */}
      <nav style={{
        position:         'fixed',
        bottom:           0,
        left:             '50%',
        transform:        'translateX(-50%)',
        width:            '100%',
        maxWidth:         500,
        background:       'rgba(5, 5, 5, 0.95)',
        backdropFilter:   'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop:        '1px solid #181818',
        display:          'flex',
        justifyContent:   'space-around',
        paddingBottom:    'env(safe-area-inset-bottom, 0px)',
        zIndex:           100,
        height:           75,
        alignItems:       'center',
      }}>
          {APP_NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={{ display: 'flex', flex: 1, textDecoration: 'none' }}
          >
            {({ isActive }) => (
              <div style={{
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                flex:           1,
                gap:            4,
                padding:        '8px 4px 0',
                position:       'relative',
                color:          isActive ? '#ff5b1f' : '#555555',
                transition:     'color 0.2s',
              }}>
                {isActive && (
                  <div style={{
                    position:     'absolute',
                    top:          0,
                    left:         '50%',
                    transform:    'translateX(-50%)',
                    width:        24,
                    height:       3,
                    background:   '#ff5b1f',
                    borderRadius: '0 0 3px 3px',
                  }} />
                )}
                <span style={{ display: 'flex', color: 'inherit' }}>
                  {NavIcons[item.to]}
                </span>
                <span style={{
                  fontSize:      9,
                  fontWeight:    isActive ? 700 : 600,
                  letterSpacing: '1px',
                  textTransform: 'uppercase' as const,
                  color:         'inherit',
                }}>
                  {item.shortLabel}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Router-aware inner component
// ──────────────────────────────────────────────────────────
function AppRoutes() {
  const { session, loading, signIn, signUp, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div style={{
        height: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: T.bg,
      }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.5px' }}>
          🚴 CycloFuel
        </span>
        <Spinner color="#ff5b1f" size={32} />
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        {/* OAuth callbacks work even before CycloFuel login */}
        <Route path="/whoop/callback"  element={<WhoopCallback />}  />
        <Route path="/strava/callback" element={<StravaCallback />} />
        <Route path="*" element={
          <Login
            onSignIn={async (e, p) => { await signIn(e, p); navigate('/', { replace: true }); }}
            onSignUp={async (e, p) => { await signUp(e, p); navigate('/', { replace: true }); }}
          />
        } />
      </Routes>
    );
  }

  return <AuthShell userId={session.user.id} onSignOut={signOut} />;
}

// ──────────────────────────────────────────────────────────
// Error Boundary
// ──────────────────────────────────────────────────────────
interface EBState { error: Error | null }
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error): EBState { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          height: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          background: '#080c14', padding: 24, textAlign: 'center',
        }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#ff5b1f' }}>🚴 CycloFuel</span>
          <div style={{ fontSize: 14, color: '#ef4444', fontWeight: 600 }}>Chyba aplikace</div>
          <div style={{
            fontSize: 12, color: '#888', background: '#111', borderRadius: 10,
            padding: '12px 16px', maxWidth: 340, wordBreak: 'break-word', textAlign: 'left',
          }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{
              padding: '10px 20px', borderRadius: 10, background: '#ff5b1f',
              color: '#000', fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none',
            }}
          >
            Vymazat cache a obnovit
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ──────────────────────────────────────────────────────────
// Root
// ──────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
