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
  calcCalories, calcMacros, calcWater, calcMicroGoals, primaryType,
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
import { ToastHost }     from './components/Toast';
import FloatingChat      from './components/FloatingChat';
import { formatLocalISODate, todayLocalISO } from './utils/date';

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

export interface ManualActivity {
  id:          string;
  date:        string;
  name:        string;
  kcal:        number;
  durationMin?: number;
  source:      'ai' | 'manual';
}

export type ManualActivitiesByDate = Record<string, ManualActivity[]>;

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
  reloadEntries:     () => Promise<void>;
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
  manualActivities:  ManualActivity[];
  manualActivityKcal: number;
  addManualActivity: (activity: Omit<ManualActivity, 'id' | 'date' | 'source'> & { date?: string; source?: ManualActivity['source'] }) => Promise<ManualActivity>;
  updateManualActivity: (id: string, update: Partial<Pick<ManualActivity, 'name' | 'kcal' | 'durationMin'>>) => Promise<void>;
  removeManualActivity: (id: string) => Promise<void>;
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
  return todayLocalISO();
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
  const { entries, totals, addEntry, removeEntry, updateEntry, updateEntryMacros, reload: reloadEntries } = useFoodEntries(userId, today);
  const { value: manualActivitiesByDate, setValue: setManualActivitiesByDate } = useUserSetting<ManualActivitiesByDate>(
    userId,
    'manual_activities_by_date',
    {},
    { legacyKey: `cyclofuel_manual_activities_${userId}` },
  );

  const manualActivities = manualActivitiesByDate[today] ?? [];
  const manualActivityKcal = manualActivities.reduce((sum, activity) => sum + Math.max(0, Math.round(activity.kcal)), 0);

  const addManualActivity: AppCtx['addManualActivity'] = useCallback(async activity => {
    const date = activity.date ?? today;
    const nextActivity: ManualActivity = {
      id: `manual_activity_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date,
      name: activity.name.trim() || 'Ruční aktivita',
      kcal: Math.max(0, Math.round(activity.kcal)),
      durationMin: activity.durationMin ? Math.max(0, Math.round(activity.durationMin)) : undefined,
      source: activity.source ?? 'ai',
    };
    const next = {
      ...manualActivitiesByDate,
      [date]: [...(manualActivitiesByDate[date] ?? []), nextActivity],
    };
    await setManualActivitiesByDate(next);
    window.dispatchEvent(new CustomEvent('intervals-cache-updated'));
    return nextActivity;
  }, [manualActivitiesByDate, setManualActivitiesByDate, today]);

  const updateManualActivity: AppCtx['updateManualActivity'] = useCallback(async (id, update) => {
    const next = Object.fromEntries(
      Object.entries(manualActivitiesByDate).map(([date, activities]) => [
        date,
        activities.map(activity =>
          activity.id === id
            ? {
                ...activity,
                ...(update.name !== undefined ? { name: update.name.trim() || activity.name } : {}),
                ...(update.kcal !== undefined ? { kcal: Math.max(0, Math.round(update.kcal)) } : {}),
                ...(update.durationMin !== undefined ? { durationMin: Math.max(0, Math.round(update.durationMin)) } : {}),
              }
            : activity
        ),
      ])
    ) as ManualActivitiesByDate;
    await setManualActivitiesByDate(next);
    window.dispatchEvent(new CustomEvent('intervals-cache-updated'));
  }, [manualActivitiesByDate, setManualActivitiesByDate]);

  const removeManualActivity: AppCtx['removeManualActivity'] = useCallback(async id => {
    const next = Object.fromEntries(
      Object.entries(manualActivitiesByDate).map(([date, activities]) => [
        date,
        activities.filter(activity => activity.id !== id),
      ])
    ) as ManualActivitiesByDate;
    await setManualActivitiesByDate(next);
    window.dispatchEvent(new CustomEvent('intervals-cache-updated'));
  }, [manualActivitiesByDate, setManualActivitiesByDate]);

  const { value: deficitLevel, setValue: setStoredDeficitLevel } = useUserSetting<DeficitLevel>(
    userId,
    'deficit_level',
    'off',
    { legacyKey: `cyclofuel_deficit_level_${userId}` },
  );

  const setDeficitLevel = (v: DeficitLevel) => {
    void setStoredDeficitLevel(v);
  };

  const trainingType = trainingDay?.training_type ?? 'rest';
  const rideHours    = trainingDay?.ride_hours    ?? 0;
  const training     = TRAINING_TYPES.find(t => t.id === trainingType)!;

  // Caloric goal = expenditure (BMR + activity). No deficit reduction.
  const deficitKcal = 0;

  const goals = useMemo<Goals>(() => {
    if (!profile) return DEFAULT_GOALS;
    // Fallback when Intervals.icu data is absent: BMR-only base.
    // Macro ratios still reflect the planned training type for guidance.
    const types     = Array.from(new Set([
      trainingType,
      ...((trainingDay?.extra_types ?? []) as TrainingType[]),
    ]));
    const macroType = primaryType(types);
    const m         = calcMacros(profile, macroType);
    const kcalGoal  = calcCalories(profile, 'rest', 0); // BMR only until Intervals.icu loads

    const kcalFinal = Math.max(1200, kcalGoal);

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
  }, [profile, trainingType, rideHours, training.microMul, trainingDay]);

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
    if ((!intervalsData.kcal && !manualActivityKcal) || !profile) return goals;
    const { kcal: actKcal, type: actType, hours: actHours } = intervalsData;
    // Goal = BMR + actual activity kcal from Intervals.icu (expenditure-based, no deficit)
    const baseBMR    = calcCalories(profile, 'rest', 0);
    const kcalNew    = Math.max(1200, Math.round(baseBMR + actKcal + manualActivityKcal));
    const fiberNew   = Math.min(45, Math.max(25, Math.round(kcalNew * 0.014)));
    const m          = calcMacros(profile, actType);
    const waterNew   = calcWater(profile, actHours);
    const rawMacroKcal = m.carbs * 4 + m.protein * 4 + m.fat * 9;
    let { carbs, protein, fat } = m;
    if (rawMacroKcal > kcalNew && rawMacroKcal > 0) {
      const scale = kcalNew / rawMacroKcal;
      carbs   = Math.round(m.carbs   * scale);
      protein = Math.round(m.protein * scale);
      fat     = Math.round(m.fat     * scale);
    }
    return { ...goals, kcal: kcalNew, fiber: fiberNew, carbs, protein, fat, water: waterNew };
  }, [goals, intervalsData, profile, manualActivityKcal]);

  // Total energy expenditure = BMR + activity from Intervals.icu.
  // Without Intervals.icu data, falls back to BMR only (phases don't estimate burned).
  const liveBurnedToday = useMemo(() => {
    if (!profile) return 0;
    return Math.round(calcCalories(profile, 'rest', 0) + (intervalsData.kcal > 0 ? intervalsData.kcal : 0) + manualActivityKcal);
  }, [profile, intervalsData.kcal, manualActivityKcal]);

  // ── Daily nutrition snapshot ──────────────────────────────────────────────
  const realToday = useMemo(() => todayLocalISO(), []);
  const isViewingToday = today === realToday;

  const {
    snapshot,
    isHistoricalSnapshot,
    saveSnapshot,
    clearSnapshot,
  } = useDailyNutritionSnapshot(userId, today);

  // Backfill snapshots for the last 7 days that don't have one yet
  useBackfillSnapshots(userId, profile);

  // For historical days that have a frozen snapshot, override computed goals
  // so the UI shows the exact values from that day rather than a recalculation.
  // Priority: burnLog (most accurate, same formula as effectiveBurnedToday) → snapshot → live
  const goalsFromSnapshot = useMemo<Goals | null>(() => {
    if (isViewingToday) return null;
    const burnLog = loadBurnLog();
    const actKcal = burnLog[today];
    const manualKcalForDate = (manualActivitiesByDate[today] ?? []).reduce((sum, activity) => sum + Math.max(0, Math.round(activity.kcal)), 0);
    if ((typeof actKcal === 'number' || manualKcalForDate > 0) && profile) {
      // Use the same BMR×1.2 + activity formula as effectiveBurnedToday so
      // CÍL PŘÍJMU and VÝDEJ are always derived from the same number.
      const freshBurned = Math.max(1200, Math.round(calcCalories(profile, 'rest', 0) + (actKcal ?? 0) + manualKcalForDate));
      return {
        ...goalsWithIntervals,
        kcal:    freshBurned, // goal = expenditure (no deficit)
        ...(snapshot ? {
          carbs:   snapshot.goal_carbs,
          protein: snapshot.goal_protein,
          fat:     snapshot.goal_fat,
          water:   snapshot.goal_water,
          fiber:   snapshot.goal_fiber,
        } : {}),
      };
    }
    if (!snapshot) return null;
    return {
      ...goalsWithIntervals,
      kcal:    snapshot.goal_kcal,
      carbs:   snapshot.goal_carbs,
      protein: snapshot.goal_protein,
      fat:     snapshot.goal_fat,
      water:   snapshot.goal_water,
      fiber:   snapshot.goal_fiber,
    };
  }, [isViewingToday, today, profile, snapshot, goalsWithIntervals, manualActivitiesByDate]);

  const baseGoals = goalsFromSnapshot ?? goalsWithIntervals;

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

  // Burned = goal = expenditure. For historical days the frozen goal IS the burned figure.
  const effectiveBurnedToday = useMemo(() => {
    if (!isViewingToday && snapshot?.goal_kcal) {
      return snapshot.goal_kcal;
    }
    return liveBurnedToday;
  }, [isViewingToday, snapshot, liveBurnedToday]);

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
        activity_kcal:    intervalsData.kcal + manualActivityKcal,
        activity_source:  intervalsData.kcal > 0 ? (manualActivityKcal > 0 ? 'intervals+manual' : 'intervals') : manualActivityKcal > 0 || trainingType !== 'rest' ? 'manual' : 'none',
        deficit_kcal:     deficitKcal,
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [isViewingToday, effectiveGoals, totals, intervalsData.kcal, manualActivityKcal, trainingType, deficitKcal, saveSnapshot]);

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
    reloadEntries,
    removeEntry,
    updateEntry,
    updateEntryMacros,
    signOut:           onSignOut,
    deficitLevel,
    setDeficitLevel,
    isHistoricalDay:   isHistoricalSnapshot,
    recalculateDay,
    burnedToday:       effectiveBurnedToday,
    manualActivities,
    manualActivityKcal,
    addManualActivity,
    updateManualActivity,
    removeManualActivity,
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
  '/plan': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  '/foods': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="8" y2="21"/><line x1="19" y1="6" x2="19" y2="21"/>
      <path d="M5 6a3 3 0 0 1 6 0v3H5V6z"/><path d="M16 6a3 3 0 0 1 6 0v7h-6V6z"/>
    </svg>
  ),
  '/supplements': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/><circle cx="18" cy="18" r="3"/><path d="m22 22-1.5-1.5"/>
    </svg>
  ),
  '/chat': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.48 2 2 6.04 2 11c0 2.52 1.09 4.79 2.85 6.41L4 22l4.71-1.57C9.73 20.8 10.83 21 12 21c5.52 0 10-4.04 10-9s-4.48-9-10-9z"/>
      <path d="M8.5 9.5h.01M12 9.5h.01M15.5 9.5h.01" strokeWidth="2.5" strokeLinecap="round"/>
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
          'radial-gradient(circle at top left, rgba(124,92,255,0.08), transparent 28%), radial-gradient(circle at top right, rgba(79,227,255,0.06), transparent 24%), #07070A',
      }}>
        <header style={{
          flexShrink: 0,
          borderBottom: `1px solid ${T.border}`,
          background: 'rgba(7,7,10,0.85)',
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
                  background: '#7C5CFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
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
                      border: `1px solid ${isActive ? 'rgba(124,92,255,0.3)' : T.border}`,
                      background: isActive
                        ? 'rgba(124,92,255,0.12)'
                        : 'rgba(255,255,255,0.02)',
                      color: isActive ? '#7C5CFF' : '#9CA3B5',
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

      {/* Page content — no global header on mobile */}
      <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 68 }}>
        {routes}
      </main>

      {/* Toast notifications */}
      <ToastHost />

      {/* Floating AI chat bubble (hidden on /chat page) */}
      <FloatingChat />

      {/* Flat Bottom Nav */}
      <nav style={{
        position:    'fixed',
        bottom:      0,
        left:        0,
        right:       0,
        background:  'rgba(11, 11, 17, 0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop:   `1px solid ${T.border}`,
        display:     'flex',
        justifyContent: 'space-around',
        zIndex:      100,
        height:      `calc(56px + env(safe-area-inset-bottom, 0px))`,
        alignItems:  'flex-start',
        paddingTop:  4,
      }}>
        {APP_NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={{ display: 'flex', flex: 1, textDecoration: 'none', justifyContent: 'center' }}
          >
            {({ isActive }) => (
              <div style={{
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                padding:        '4px 6px',
                gap:            2,
                color:          isActive ? '#7C5CFF' : '#5B6178',
              }}>
                <span style={{ display: 'flex', color: 'inherit' }}>
                  {NavIcons[item.to]}
                </span>
                <span style={{
                  fontSize:      9,
                  fontWeight:    isActive ? 700 : 500,
                  letterSpacing: '0.06em',
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
  const { session, loading, signIn, signOut } = useAuth();
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
        <Spinner color="#7C5CFF" size={32} />
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
            onSignIn={async p => { await signIn(p); navigate('/', { replace: true }); }}
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
          background: '#07070A', padding: 24, textAlign: 'center',
        }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#7C5CFF' }}>🚴 CycloFuel</span>
          <div style={{ fontSize: 14, color: '#FF6B9C', fontWeight: 600 }}>Chyba aplikace</div>
          <div style={{
            fontSize: 12, color: '#9CA3B5', background: '#11111A', borderRadius: 10,
            padding: '12px 16px', maxWidth: 340, wordBreak: 'break-word', textAlign: 'left',
          }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{
              padding: '10px 20px', borderRadius: 10, background: '#7C5CFF',
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', border: 'none',
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
