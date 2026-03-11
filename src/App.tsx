import React, {
  createContext, useContext, useMemo, useState,
} from 'react';
import {
  BrowserRouter, Routes, Route, NavLink, useNavigate, Navigate,
} from 'react-router-dom';

import { useAuth }        from './hooks/useAuth';
import { useProfile }     from './hooks/useProfile';
import { useTrainingDay } from './hooks/useTrainingDay';
import { useFoodEntries } from './hooks/useFoodEntries';

import type { Profile as ProfileData } from './hooks/useProfile';
import type { TrainingDay } from './hooks/useTrainingDay';
import type { FoodEntry, MacroTotals } from './hooks/useFoodEntries';

import {
  TRAINING_TYPES,
  calcCalories, calcMacros, calcWater, calcMicroGoals,
} from './constants/training';

import Login       from './pages/Login';
import Dashboard   from './pages/Dashboard';
import Foods       from './pages/Foods';
import Micros      from './pages/Micros';
import Plan        from './pages/Plan';
import Profile     from './pages/Profile';
import Supplements from './pages/Supplements';

import { T, Spinner } from './components/UI';

// ──────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────
export interface Goals {
  kcal:    number;
  carbs:   number;
  protein: number;
  fat:     number;
  water:   number;
  micros:  Record<string, number>;
}

export interface AppCtx {
  userId:             string;
  today:              string;
  setToday:           (date: string) => void;
  accent:             string;
  accentGlow:         string;
  profile:            ProfileData | null;
  saveProfile:        (u: Partial<Omit<ProfileData, 'id'>>) => Promise<void>;
  trainingDay:        TrainingDay | null;
  upsertTrainingDay:  (u: Partial<TrainingDay>) => Promise<void>;
  entries:            FoodEntry[];
  totals:             MacroTotals;
  goals:              Goals;
  addEntry:           (e: Omit<FoodEntry, 'id'>) => Promise<void>;
  removeEntry:        (id: string) => Promise<void>;
  signOut:            () => Promise<void>;
}

const DEFAULT_GOALS: Goals = {
  kcal: 2000, carbs: 250, protein: 130, fat: 70, water: 2.5,
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
  const { entries, totals, addEntry, removeEntry } = useFoodEntries(userId, today);

  const trainingType = trainingDay?.training_type ?? 'rest';
  const rideHours    = trainingDay?.ride_hours    ?? 0;
  const training     = TRAINING_TYPES.find(t => t.id === trainingType)!;

  const goals = useMemo<Goals>(() => {
    if (!profile) return DEFAULT_GOALS;
    const m = calcMacros(profile, trainingType);
    return {
      kcal:    calcCalories(profile, trainingType, rideHours),
      carbs:   m.carbs,
      protein: m.protein,
      fat:     m.fat,
      water:   calcWater(profile, rideHours),
      micros:  calcMicroGoals(training.microMul),
    };
  }, [profile, trainingType, rideHours, training.microMul]);

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
    goals,
    addEntry,
    removeEntry,
    signOut:           onSignOut,
  };

  return (
    <AppContext.Provider value={ctx}>
      <AppLayout accent={training.color} today={today} setToday={setToday} />
    </AppContext.Provider>
  );
}

// ──────────────────────────────────────────────────────────
// Layout
// ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/',            icon: '🏠', label: 'Přehled' },
  { to: '/foods',       icon: '🍽️', label: 'Jídla'   },
  { to: '/plan',        icon: '⚡', label: 'Plán'    },
  { to: '/supplements', icon: '💊', label: 'Supl.'   },
  { to: '/micros',      icon: '📊', label: 'Mikro'   },
  { to: '/profile',     icon: '👤', label: 'Profil'  },
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

  const navBtnStyle: React.CSSProperties = {
    background:  'none',
    border:      'none',
    color:       T.muted,
    fontSize:    18,
    lineHeight:  1,
    cursor:      'pointer',
    padding:     '4px 6px',
    borderRadius: 6,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: T.bg }}>

      {/* Sticky Header */}
      <header style={{
        position:       'sticky',
        top:            0,
        zIndex:         50,
        background:     T.bg + 'f0',
        backdropFilter: 'blur(12px)',
        borderBottom:   `1px solid ${T.border}`,
        padding:        '10px 16px',
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        flexShrink:     0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🚴</span>
          <span style={{
            fontFamily: 'Syne, sans-serif',
            fontSize:   20,
            fontWeight: 800,
            color:      accent,
            transition: 'color 0.4s',
          }}>
            CycloFuel
          </span>
        </div>

        {/* Date navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <button onClick={prevDay} style={navBtnStyle} aria-label="Předchozí den">‹</button>

          {/* Clicking the label opens native date picker */}
          <label style={{ cursor: 'pointer', position: 'relative', margin: '0 2px' }}>
            <span style={{
              fontSize:   12,
              color:      isToday ? accent : T.muted,
              fontWeight: isToday ? 700 : 400,
              whiteSpace: 'nowrap',
              display:    'block',
              padding:    '4px 4px',
              borderRadius: 6,
              transition: 'color 0.2s',
            }}>
              {dateLabel}
            </span>
            {/* Hidden native date picker */}
            <input
              type="date"
              value={today}
              onChange={e => e.target.value && setToday(e.target.value)}
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                opacity: 0, cursor: 'pointer',
              }}
            />
          </label>

          <button
            onClick={nextDay}
            style={navBtnStyle}
            aria-label="Následující den"
          >›</button>
        </div>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        <Routes>
          <Route path="/"            element={<Dashboard />}   />
          <Route path="/foods"       element={<Foods />}       />
          <Route path="/plan"        element={<Plan />}        />
          <Route path="/supplements" element={<Supplements />} />
          <Route path="/micros"      element={<Micros />}      />
          <Route path="/profile"     element={<Profile />}     />
          <Route path="*"        element={<Navigate to="/" replace />} />
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
        background:     T.card + 'f8',
        backdropFilter: 'blur(16px)',
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
              padding:        '9px 0 6px',
              flex:           1,
              textDecoration: 'none',
              color:          isActive ? accent : T.muted,
              fontSize:       10,
              fontWeight:     isActive ? 600 : 400,
              gap:            2,
              transition:     'color 0.2s',
            })}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
            {item.label}
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
