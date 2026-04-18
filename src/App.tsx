import React, {
  createContext, useContext, useEffect, useMemo, useState,
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
  addEntry:          (e: Omit<FoodEntry, 'id'>) => Promise<void>;
  removeEntry:       (id: string) => Promise<void>;
  updateEntry:       (id: string, newGrams: number, newMealSlot?: string) => Promise<void>;
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
  return new Date().toISOString().split('T')[0];
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

function readIntervalsKcalToday(today: string): number {
  try {
    const raw = localStorage.getItem('cyclofuel_intervals_cache');
    if (!raw) return 0;
    const cache = JSON.parse(raw);
    return (cache.activities ?? [])
      .filter((a: { start_date_local: string }) => a.start_date_local.startsWith(today))
      .reduce((s: number, a: Parameters<typeof kcalFromActivity>[0]) => s + kcalFromActivity(a), 0);
  } catch { return 0; }
}

// ──────────────────────────────────────────────────────────
// Authenticated shell
// ──────────────────────────────────────────────────────────
interface AuthShellProps {
  userId:    string;
  onSignOut: () => Promise<void>;
}

function AuthShell({ userId, onSignOut }: AuthShellProps) {
  // Mutable – user can switch to any date
  const [today, setToday] = useState(() => todayISO());

  const { profile,     save: saveProfile    } = useProfile(userId);
  const { trainingDay, upsert              } = useTrainingDay(userId, today);
  const { entries, totals, addEntry, removeEntry, updateEntry } = useFoodEntries(userId, today);

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

  // ── Intervals.icu: přidat spálené kalorie k dennímu cíli ──
  const [intervalsKcalToday, setIntervalsKcalToday] = useState(
    () => readIntervalsKcalToday(today),
  );
  useEffect(() => {
    setIntervalsKcalToday(readIntervalsKcalToday(today));
    const handler = () => setIntervalsKcalToday(readIntervalsKcalToday(today));
    window.addEventListener('intervals-cache-updated', handler);
    return () => window.removeEventListener('intervals-cache-updated', handler);
  }, [today]);

  const goalsWithIntervals = useMemo<Goals>(() => {
    if (!intervalsKcalToday || !profile) return goals;
    // Základní metabolismus (klidový den) + co spálil Intervals
    const baseBMR  = calcCalories(profile, 'rest', 0);
    const kcalNew  = Math.round(baseBMR + intervalsKcalToday);
    const fiberNew = Math.min(45, Math.max(25, Math.round(kcalNew * 0.014)));
    return { ...goals, kcal: kcalNew, fiber: fiberNew };
  }, [goals, intervalsKcalToday, profile]);

  // Uložit cíl kalorií pro aktuální den, aby ho historie zobrazila správně
  const { saveGoalForDate } = useDailyGoals();
  useEffect(() => {
    if (goalsWithIntervals.kcal > 0) saveGoalForDate(today, goalsWithIntervals.kcal);
  }, [today, goalsWithIntervals.kcal, saveGoalForDate]);

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
    goals: goalsWithIntervals,
    addEntry,
    removeEntry,
    updateEntry,
    signOut:           onSignOut,
    deficitLevel,
    setDeficitLevel,
  };

  return (
    <AppContext.Provider value={ctx}>
      <AppLayout accent={training.color} today={today} setToday={setToday} />
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
  accent:   string;
  today:    string;
  setToday: (date: string) => void;
}

function AppLayout({ accent, today, setToday }: AppLayoutProps) {
  const realToday = todayISO();

  // Human-friendly date label
  const dateLabel = (() => {
    const d         = new Date(today + 'T00:00:00');
    const dateShort = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });

    if (today === realToday) return `Dnes · ${dateShort}`;

    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    if (today === yest.toISOString().split('T')[0]) return `Včera · ${dateShort}`;

    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    if (today === tom.toISOString().split('T')[0]) return `Zítra · ${dateShort}`;

    const dayShort = d.toLocaleDateString('cs-CZ', { weekday: 'short' });
    return `${dayShort} ${dateShort}`;
  })();

  const prevDay = () => {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setToday(d.toISOString().split('T')[0]);
  };

  const nextDay = () => {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setToday(d.toISOString().split('T')[0]);
  };

  const isToday = today === realToday;

  return (
    // height:100dvh + overflow:hidden → body nikdy nescrolluje
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: T.bg }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: T.bg, zIndex: 50 }}>

        {/* Řádek 1: Logo */}
        <div style={{
          padding:      '10px 16px',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.4s',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
              </svg>
            </div>
            <span style={{
              fontFamily:    'Syne, sans-serif',
              fontSize:      16,
              fontWeight:    800,
              color:         T.text,
              letterSpacing: '0.04em',
              textTransform: 'uppercase' as const,
            }}>CycloFuel</span>
          </div>
          <div style={{
            fontSize: 11, color: accent, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase' as const,
            background: accent + '18', padding: '4px 10px', borderRadius: 20,
          }}>
            ● Live
          </div>
        </div>

        {/* Řádek 2: Datum – 44px výška, plná šířka */}
        <div style={{
          display:      'flex',
          alignItems:   'stretch',
          borderBottom: `1px solid ${T.border}`,
          height:       44,
        }}>
          {/* ◀ Předchozí den */}
          <button
            type="button"
            onClick={prevDay}
            style={{
              flex:                    '0 0 56px',
              background:              'none',
              border:                  'none',
              borderRight:             `1px solid ${T.border}`,
              color:                   T.muted,
              cursor:                  'pointer',
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              touchAction:             'manipulation',
              WebkitTapHighlightColor: 'transparent',
              userSelect:              'none',
            }}
            aria-label="Předchozí den"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Datum – průhledný date input překrývá text; iOS ho přímo tapne */}
          <div style={{
            flex:            1,
            position:        'relative',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
          }}>
            <span style={{
              fontSize:   14,
              fontWeight: isToday ? 700 : 400,
              color:      isToday ? accent : T.muted,
              transition: 'color 0.2s',
              pointerEvents: 'none',   // text nepřekáží inputu
            }}>
              {dateLabel}
            </span>
            {/* input zakrývá celou plochu – opacity 0, ale má pointer-events */}
            <input
              type="date"
              value={today}
              onChange={e => e.target.value && setToday(e.target.value)}
              style={{
                position: 'absolute',
                inset:    0,
                opacity:  0,
                cursor:   'pointer',
                width:    '100%',
                height:   '100%',
              }}
            />
          </div>

          {/* ▶ Následující den */}
          <button
            type="button"
            onClick={nextDay}
            style={{
              flex:                    '0 0 56px',
              background:              'none',
              border:                  'none',
              borderLeft:              `1px solid ${T.border}`,
              color:                   T.muted,
              cursor:                  'pointer',
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              touchAction:             'manipulation',
              WebkitTapHighlightColor: 'transparent',
              userSelect:              'none',
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

      {/* Page content – flex:1 + minHeight:0 zajistí že main neroste za výšku viewportu */}
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
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Fixed Bottom Nav */}
      <nav style={{
        position:       'fixed',
        bottom:         0,
        left:           '50%',
        transform:      'translateX(-50%)',
        width:          '100%',
        maxWidth:       500,
        background:     '#0e0e0e',
        borderTop:      `1px solid ${T.border}`,
        display:        'flex',
        justifyContent: 'space-around',
        paddingBottom:  'env(safe-area-inset-bottom, 0px)',
        zIndex:         50,
      }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              padding:        '10px 0 7px',
              flex:           1,
              textDecoration: 'none',
              color:          isActive ? accent : '#3a3a3a',
              gap:            4,
              transition:     'color 0.2s',
              position:       'relative' as const,
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div style={{
                    position: 'absolute', top: 0, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 28, height: 2, borderRadius: 2,
                    background: accent, transition: 'background 0.3s',
                  }} />
                )}
                <span style={{ color: isActive ? accent : '#3a3a3a', transition: 'color 0.2s', display: 'flex' }}>
                  {NavIcons[item.to]}
                </span>
                <span style={{
                  fontSize:      9,
                  fontWeight:    isActive ? 700 : 400,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase' as const,
                  color:         isActive ? accent : '#3a3a3a',
                }}>
                  {item.label}
                </span>
              </>
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
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#22c55e' }}>
          🚴 CycloFuel
        </span>
        <Spinner color="#22c55e" size={32} />
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
// Root
// ──────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
