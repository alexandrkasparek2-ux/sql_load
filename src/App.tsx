import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  BrowserRouter, Routes, Route, NavLink, useNavigate, Navigate,
} from 'react-router-dom';

import { useAuth }        from './hooks/useAuth';
import { useProfile }     from './hooks/useProfile';
import { useTrainingDay } from './hooks/useTrainingDay';
import { useFoodEntries } from './hooks/useFoodEntries';
import { useDailyGoals }  from './hooks/useDailyGoals';

import type { Profile as ProfileData } from './hooks/useProfile';
import type { TrainingDay } from './hooks/useTrainingDay';
import type { FoodEntry, MacroTotals } from './hooks/useFoodEntries';

import {
  TRAINING_TYPES,
  calcCaloriesMulti, calcCalories, calcMacros, calcWater, calcMicroGoals,
  type TrainingType,
} from './constants/training';

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

  const [deficitLevel, setDeficitLevelState] = useState<DeficitLevel>(() => {
    const v = localStorage.getItem(`cyclofuel_deficit_level_${userId}`);
    return (v as DeficitLevel) ?? 'off';
  });

  const setDeficitLevel = (v: DeficitLevel) => {
    localStorage.setItem(`cyclofuel_deficit_level_${userId}`, v);
    setDeficitLevelState(v);
  };

  const trainingType = trainingDay?.training_type ?? 'rest';
  const rideHours    = trainingDay?.ride_hours    ?? 0;
  const training     = TRAINING_TYPES.find(t => t.id === trainingType)!;

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

    // Apply weight-loss deficit
    const targetW = Number(localStorage.getItem(`cyclofuel_target_weight_${userId}`) ?? profile.weight);
    const deficit = deficitLevel !== 'off' && targetW < profile.weight ? DEFICIT_KCAL[deficitLevel] : 0;
    const kcalFinal = Math.max(1200, kcalGoal - deficit);

    // Vláknina: ~14 g / 1 000 kcal, min 25 g, max 45 g
    const fiberGoal = Math.min(45, Math.max(25, Math.round(kcalFinal * 0.014)));
    return {
      kcal:    kcalFinal,
      carbs:   m.carbs,
      protein: m.protein,
      fat:     m.fat,
      fiber:   fiberGoal,
      water:   calcWater(profile, rideHours),
      micros:  calcMicroGoals(training.microMul),
    };
  }, [profile, trainingType, rideHours, training.microMul, trainingDay, deficitLevel, userId]);

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
    // Total: BMR (rest) + actual activity kcal from Intervals
    const baseBMR  = calcCalories(profile, 'rest', 0);
    const kcalNew  = Math.round(baseBMR + actKcal);
    const fiberNew = Math.min(45, Math.max(25, Math.round(kcalNew * 0.014)));
    // Recalculate macros based on actual training type and duration from Intervals
    const m        = calcMacros(profile, actType);
    const waterNew = calcWater(profile, actHours);
    return { ...goals, kcal: kcalNew, fiber: fiberNew, carbs: m.carbs, protein: m.protein, fat: m.fat, water: waterNew };
  }, [goals, intervalsData, profile]);

  // Uložit cíl kalorií pro aktuální den, aby ho historie zobrazila správně
  const { saveGoalForDate } = useDailyGoals();
  useEffect(() => {
    if (goalsWithIntervals.kcal > 0) saveGoalForDate(today, goalsWithIntervals.kcal);
  }, [today, goalsWithIntervals.kcal, saveGoalForDate]);

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
    ? { ...goalsWithIntervals, ...goalOverride }
    : goalsWithIntervals;

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
  };

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

const NAV_ITEMS = [
  { to: '/',            label: 'Přehled'  },
  { to: '/foods',       label: 'Jídla'    },
  { to: '/chat',        label: 'AI'       },
  { to: '/plan',        label: 'Plán'     },
  { to: '/supplements', label: 'Supl.'    },
  { to: '/profile',     label: 'Profil'   },
] as const;

interface AppLayoutProps {
  today:    string;
  setToday: (date: string) => void;
}

function AppLayout({ today, setToday }: AppLayoutProps) {
  const realToday = todayISO();

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
            {/* Live badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px',
              background: 'rgba(0, 229, 176, 0.1)',
              border: '1px solid rgba(0, 229, 176, 0.3)',
              borderRadius: 6,
              fontSize: 9, fontWeight: 700, color: '#00E5B0',
              letterSpacing: '1px', textTransform: 'uppercase' as const,
            }}>
              <div style={{
                width: 6, height: 6, background: '#00E5B0',
                borderRadius: '50%', animation: 'pulse 2s infinite',
              }} />
              Sync
            </div>
            {/* Avatar */}
            <div style={{
              width: 38, height: 38,
              background: 'linear-gradient(135deg, #FFD600, #FF6B35)',
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
              color: isToday ? '#FFD600' : T.muted, transition: 'color 0.2s',
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
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
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
        {NAV_ITEMS.map(item => (
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
                color:          isActive ? '#FFD600' : '#555555',
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
                    background:   'linear-gradient(90deg, #FFD600, #FF6B35)',
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
                  {item.label}
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
        <span style={{ fontSize: 24, fontWeight: 800, color: '#FFD600', letterSpacing: '-0.5px' }}>
          🚴 CycloFuel
        </span>
        <Spinner color="#FFD600" size={32} />
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
          <span style={{ fontSize: 24, fontWeight: 800, color: '#FFD600' }}>🚴 CycloFuel</span>
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
              padding: '10px 20px', borderRadius: 10, background: '#FFD600',
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
