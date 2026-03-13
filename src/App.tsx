import {
  createContext, useContext, useMemo, useState, useRef,
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
  updateEntry:        (id: string, newGrams: number, newMealSlot?: string) => Promise<void>;
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
  const { entries, totals, addEntry, removeEntry, updateEntry } = useFoodEntries(userId, today);

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
    updateEntry,
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

  // Ref na skrytý date input – voláme showPicker() programaticky
  const dateInputRef = useRef<HTMLInputElement>(null);
  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof (el as any).showPicker === 'function') {
      (el as any).showPicker();
    } else {
      el.click();
    }
  };

  return (
    // height:100dvh + overflow:hidden → body nikdy nescrolluje → iOS Safari
    // nepřijde o touch eventy na headeru kvůli body scroll interceptu
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: T.bg }}>

      {/* Header – nepotřebuje sticky, body nescrolluje */}
      <div style={{
        flexShrink: 0,
        background: T.bg,
        zIndex:     50,
      }}>
        {/* Řádek 1: Logo */}
        <div style={{
          padding:        '8px 16px',
          display:        'flex',
          alignItems:     'center',
          gap:            8,
          borderBottom:   `1px solid ${T.border}`,
        }}>
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

        {/* Řádek 2: Navigace datumem – plná šířka, velké touch targety */}
        <div style={{
          display:      'flex',
          alignItems:   'stretch',
          borderBottom: `1px solid ${T.border}`,
          height:       44,
        }}>
          {/* Šipka zpět */}
          <button
            type="button"
            onPointerDown={e => { e.preventDefault(); prevDay(); }}
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

          {/* Datum uprostřed – klik otevře native date picker */}
          <button
            type="button"
            onPointerDown={e => { e.preventDefault(); openDatePicker(); }}
            style={{
              flex:                    1,
              background:              'none',
              border:                  'none',
              cursor:                  'pointer',
              position:                'relative',
              touchAction:             'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-label="Vybrat datum"
          >
            <span style={{
              fontSize:   14,
              fontWeight: isToday ? 700 : 400,
              color:      isToday ? accent : T.muted,
              transition: 'color 0.2s',
            }}>
              {dateLabel}
            </span>
            <input
              ref={dateInputRef}
              type="date"
              value={today}
              onChange={e => e.target.value && setToday(e.target.value)}
              style={{
                position:      'absolute',
                opacity:       0,
                pointerEvents: 'none',
                width:         1,
                height:        1,
                top:           0,
                left:          0,
              }}
            />
          </button>

          {/* Šipka vpřed */}
          <button
            type="button"
            onPointerDown={e => { e.preventDefault(); nextDay(); }}
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
