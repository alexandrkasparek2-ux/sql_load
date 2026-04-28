import { useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext, DEFICIT_KCAL }  from '../App';
import { T, BRAND, MacroCard, ProgressBar, ProgressRing, SectionTitle, Card, Btn } from '../components/UI';
import { MICRO_META, TRAINING_TYPES, MEAL_RECS, primaryType } from '../constants/training';
import { FOODS } from '../constants/foods';
import { useWeeklyData, type DayKcal } from '../hooks/useWeeklyData';
import { useIntervalsData } from '../hooks/useIntervalsData';
import { IntervalsCard } from '../components/IntervalsCard';
import { useTrainingPlan } from '../hooks/useTrainingPlan';
import { workoutNutritionTip, sportIcon as tpSportIcon } from '../services/trainingPeaksService';

// ─── Weekly summary ───────────────────────────────────────────
function WeeklySummaryCard({ historyData, accent }: { historyData: DayKcal[]; accent: string }) {
  const last7 = historyData.slice(-7);
  const withData = last7.filter(d => d.kcal > 0);
  if (withData.length < 2) return null;

  const avgKcal    = Math.round(withData.reduce((s, d) => s + d.kcal, 0) / withData.length);
  const onTarget   = withData.filter(d => d.goal > 0 && d.kcal >= d.goal * 0.88 && d.kcal <= d.goal * 1.12).length;
  const avgDeficit = withData.reduce((s, d) => s + (d.burned > 0 ? d.burned - d.kcal : 0), 0) / withData.length;
  const totalTSS   = 0; // placeholder — extended via Intervals data when available

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📊</span>
          <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: T.text, fontSize: 14 }}>
            Týdenní přehled
          </span>
        </div>
        <span style={{ fontSize: 10, color: T.muted }}>posledních 7 dní</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
        {[
          { label: 'Průměr / den', value: `${avgKcal}`, unit: 'kcal', color: accent },
          { label: 'Dny v cíli',   value: `${onTarget}/${withData.length}`, unit: '', color: BRAND.green },
          { label: 'Průměrný deficit', value: avgDeficit > 0 ? `${Math.round(avgDeficit)}` : '—', unit: avgDeficit > 0 ? 'kcal' : '', color: BRAND.orange },
          { label: 'Aktivní dny', value: `${withData.length}`, unit: '/ 7', color: T.muted },
        ].map(s => (
          <div key={s.label} style={{ background: T.bg, borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
              {s.value}
              {s.unit && <span style={{ fontSize: 10, color: T.muted, marginLeft: 3 }}>{s.unit}</span>}
            </div>
          </div>
        ))}
      </div>
      {totalTSS > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.muted }}>
          Celkový TSS za týden: <span style={{ color: BRAND.purple, fontWeight: 700 }}>{Math.round(totalTSS)}</span>
        </div>
      )}
    </Card>
  );
}

// ─── Training timing card ─────────────────────────────────────
interface IntervalsAct {
  start_date_local: string;
  moving_time:      number;
  type:             string;
  name:             string;
}

function TrainingTimingCard({ activities, goals }: {
  activities: IntervalsAct[];
  goals: { protein: number; carbs: number };
}) {
  const now     = Date.now();
  const todayStr = new Date().toISOString().split('T')[0];

  const todayActs = activities.filter(a => a.start_date_local.startsWith(todayStr));
  if (todayActs.length === 0) return null;

  // Find most recently ended activity
  const endedActs = todayActs
    .map(a => ({ ...a, endMs: new Date(a.start_date_local).getTime() + a.moving_time * 1000 }))
    .filter(a => a.endMs < now)
    .sort((a, b) => b.endMs - a.endMs);

  const lastEnded = endedActs[0];
  if (!lastEnded) return null;

  const minsAgo = Math.round((now - lastEnded.endMs) / 60_000);
  if (minsAgo > 90) return null;  // window expired

  const inWindow = minsAgo <= 45;
  const color    = inWindow ? BRAND.green : BRAND.gold;

  return (
    <div style={{
      background: color + '0e', border: `1px solid ${color}33`,
      borderRadius: 14, padding: '12px 16px', marginBottom: 14,
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{inWindow ? '🥛' : '⏳'}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 3 }}>
          {inWindow
            ? `Proteiny! Trénink skončil před ${minsAgo} min`
            : `Proteiny — ještěze stihneš (${minsAgo} min)`
          }
        </div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
          Sněz <span style={{ color: T.text, fontWeight: 600 }}>
            {Math.round(goals.protein * 0.25)}–{Math.round(goals.protein * 0.3)}g bílkovin
          </span> do {Math.max(0, 45 - minsAgo)} min.
          Sacharidy: <span style={{ color: T.text, fontWeight: 600 }}>{Math.round(goals.carbs * 0.2)}g</span> pro regeneraci.
        </div>
      </div>
    </div>
  );
}

// ─── Electrolyte card (long rides) ───────────────────────────
function ElectrolyteCard({ rideHours, totals, goals }: {
  rideHours:  number;
  totals: { na: number; k: number; mg: number };
  goals:  { na: number; k: number; mg: number };
}) {
  if (rideHours < 1.5) return null;

  const adjustedGoals = { na: goals.na * 1.5, k: goals.k * 1.5, mg: goals.mg * 1.5 };
  const electrolytes = [
    { key: 'na' as const, label: 'Sodík (Na)',    unit: 'mg', color: '#06b6d4' },
    { key: 'k'  as const, label: 'Draslík (K)',   unit: 'mg', color: '#8b5cf6' },
    { key: 'mg' as const, label: 'Hořčík (Mg)',   unit: 'mg', color: '#22c55e' },
  ];
  const anyLow = electrolytes.some(e => totals[e.key] < adjustedGoals[e.key] * 0.7);

  return (
    <Card style={{ marginBottom: 16, borderColor: anyLow ? '#f59e0b44' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>💧</span>
        <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: T.text, fontSize: 14 }}>
          Elektrolyty
        </span>
        <span style={{ fontSize: 10, color: '#f59e0b', background: '#f59e0b18', padding: '2px 8px', borderRadius: 6, marginLeft: 4 }}>
          jízda {rideHours.toFixed(1)}h → +50%
        </span>
      </div>
      {electrolytes.map(e => {
        const val  = totals[e.key];
        const goal = adjustedGoals[e.key];
        const pct  = goal > 0 ? Math.min(100, (val / goal) * 100) : 0;
        const low  = pct < 60;
        return (
          <div key={e.key} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: T.text }}>{e.label}</span>
              <span style={{ fontSize: 12, color: low ? '#f59e0b' : T.muted, fontWeight: low ? 700 : 400 }}>
                {Math.round(val)} / {Math.round(goal)} {e.unit}
                {low && ' ⚠️'}
              </span>
            </div>
            <ProgressBar value={val} max={goal} color={low ? '#f59e0b' : e.color} height={5} />
          </div>
        );
      })}
      {anyLow && (
        <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4, lineHeight: 1.5 }}>
          Při dlouhých jízdách doplňuj elektrolyty — izotonické nápoje, banány, tyčinky s elektrolyty.
        </div>
      )}
    </Card>
  );
}

// ─── Stretching checklist ─────────────────────────────────────
interface StoredStretch { name: string; duration: string; desc: string; checked: boolean; }

function StretchingChecklist({ userId, today, accent }: { userId: string; today: string; accent: string }) {
  const key = `cyclofuel_stretching_${userId}_${today}`;

  const [stretches, setStretches] = useState<StoredStretch[]>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? []; }
    catch { return []; }
  });

  const toggle = useCallback((i: number) => {
    setStretches(prev => {
      const next = prev.map((s, idx) => idx === i ? { ...s, checked: !s.checked } : s);
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  const dismiss = () => {
    localStorage.removeItem(key);
    setStretches([]);
  };

  if (!stretches.length) return null;

  const doneCount = stretches.filter(s => s.checked).length;
  const allDone   = doneCount === stretches.length;

  return (
    <>
      <SectionTitle accent={accent}>
        🧘 Strečink po tréninku
        <span style={{ fontSize: 11, color: T.muted, fontWeight: 400, marginLeft: 8 }}>
          {doneCount}/{stretches.length}
        </span>
      </SectionTitle>
      <Card style={{ marginBottom: 16, borderColor: allDone ? '#22c55e44' : accent + '33', background: allDone ? '#22c55e08' : undefined }}>
        {allDone && (
          <div style={{ textAlign: 'center', padding: '10px 0 14px' }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>🏆</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', marginBottom: 8 }}>
              Skvělá práce! Strečink splněn.
            </div>
            <button
              onClick={dismiss}
              style={{ background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: 10, color: '#22c55e', padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              Zavřít
            </button>
          </div>
        )}
        {!allDone && stretches.map((s, i) => (
          <div
            key={i}
            onClick={() => toggle(i)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
              padding: '10px 0',
              borderBottom: i < stretches.length - 1 ? `1px solid ${T.border}` : 'none',
              opacity: s.checked ? 0.45 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {/* Checkbox */}
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
              border: `2px solid ${s.checked ? '#22c55e' : accent}`,
              background: s.checked ? '#22c55e' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              {s.checked && <span style={{ color: '#000', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text, textDecoration: s.checked ? 'line-through' : 'none' }}>{s.name}</span>
                <span style={{ fontSize: 11, color: accent, background: accent + '18', padding: '2px 7px', borderRadius: 20, flexShrink: 0, marginLeft: 8 }}>
                  ⏱ {s.duration}
                </span>
              </div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.4 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}

// ─── 14-day history chart ─────────────────────────────────────
function HistoryChart({ data, accent, kcalGoal }: { data: DayKcal[]; accent: string; kcalGoal: number }) {
  const today   = new Date().toISOString().split('T')[0];
  const hasBurn = data.some(d => d.burned > 0);
  const maxVal  = Math.max(
    ...data.map(d => d.kcal),
    ...data.map(d => d.goal || kcalGoal),
    ...data.map(d => d.burned),
    kcalGoal,
    1,
  );
  const barW   = 22;
  const gap    = 7;
  const H      = 70;

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
      <svg
        viewBox={`0 0 ${data.length * (barW + gap)} ${H + 32}`}
        width={data.length * (barW + gap)}
        height={H + 32}
        style={{ display: 'block', overflow: 'visible', minWidth: '100%' }}
      >
        {data.map((d, i) => {
          const x          = i * (barW + gap);
          const barH       = maxVal > 0 ? (d.kcal / maxVal) * H : 0;
          const y          = H - barH;
          const isToday    = d.date === today;
          const dayGoal    = d.goal > 0 ? d.goal : kcalGoal;
          const goalY      = dayGoal > 0 ? H - (dayGoal / maxVal) * H : -1;
          const overGoal   = d.kcal > 0 && dayGoal > 0 && d.kcal > dayGoal * 1.1;
          const barColor   = isToday ? accent
            : overGoal ? '#ef444488'
            : d.kcal > 0 ? accent + '55'
            : T.border;

          return (
            <g key={d.date}>
              {/* Background track */}
              <rect x={x} y={0} width={barW} height={H} rx={3} fill={T.border + '80'} />
              {/* Filled bar */}
              {d.kcal > 0 && (
                <rect
                  x={x} y={y} width={barW} height={barH} rx={3}
                  fill={barColor}
                  style={{ filter: isToday ? `drop-shadow(0 0 4px ${accent}88)` : 'none' }}
                />
              )}
              {/* Goal line – per-day */}
              {dayGoal > 0 && goalY >= 0 && (
                <line
                  x1={x} y1={goalY} x2={x + barW} y2={goalY}
                  stroke={accent + 'aa'} strokeWidth={1.5} strokeDasharray="3,2"
                />
              )}
              {/* Burn line – from Intervals.icu */}
              {hasBurn && d.burned > 0 && (() => {
                const burnY = H - (d.burned / maxVal) * H;
                return (
                  <line
                    x1={x} y1={burnY} x2={x + barW} y2={burnY}
                    stroke="#FF6B35" strokeWidth={2} strokeLinecap="round"
                  />
                );
              })()}
              {/* Day label */}
              <text
                x={x + barW / 2} y={H + 12}
                textAnchor="middle" fontSize={8}
                fill={isToday ? accent : '#6b7280'}
                fontWeight={isToday ? '700' : '400'}
              >
                {d.label}
              </text>
              {/* Date number */}
              <text
                x={x + barW / 2} y={H + 23}
                textAnchor="middle" fontSize={7}
                fill={isToday ? accent + 'cc' : '#4b5563'}
              >
                {d.dateNum}
              </text>
              {/* Value label */}
              {d.kcal > 0 && (
                <text
                  x={x + barW / 2} y={Math.max(y - 3, 9)}
                  textAnchor="middle" fontSize={7}
                  fill={isToday ? accent : '#6b7280'}
                >
                  {d.kcal >= 1000 ? `${(d.kcal / 1000).toFixed(1)}k` : String(Math.round(d.kcal))}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Water tracker ───────────────────────────────────────────
function WaterTracker({
  glasses, goalLitres, accent, onAdd, onRemove,
}: {
  glasses:    number;
  goalLitres: number;
  accent:     string;
  onAdd:      () => void;
  onRemove:   () => void;
}) {
  const goalGlasses = Math.round(goalLitres * 4);
  const consumed    = (glasses * 0.25).toFixed(1);
  const pct         = goalGlasses > 0 ? Math.min(100, (glasses / goalGlasses) * 100) : 0;

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>💧</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Hydratace</div>
            <div style={{ fontSize: 12, color: T.muted }}>{consumed} / {goalLitres} L</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onRemove}
            style={{ width: 30, height: 30, borderRadius: 8, background: T.border, border: 'none', color: T.text, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >−</button>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: accent, minWidth: 28, textAlign: 'center' }}>
            {glasses}
          </span>
          <button
            onClick={onAdd}
            style={{ width: 30, height: 30, borderRadius: 8, background: accent + '22', border: `1px solid ${accent}44`, color: accent, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >+</button>
        </div>
      </div>
      <ProgressBar value={glasses} max={goalGlasses} color={accent} height={5} />
      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
        {Array.from({ length: Math.min(goalGlasses, 12) }).map((_, i) => (
          <span key={i} style={{ fontSize: 14, opacity: i < glasses ? 1 : 0.2 }}>💧</span>
        ))}
        {goalGlasses > 12 && <span style={{ fontSize: 12, color: T.muted }}>+{goalGlasses - 12}</span>}
      </div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
        Cíl: {goalGlasses} sklenic ({goalLitres} L)  •  1 sklenice = 250 ml  •  {pct.toFixed(0)} %
      </div>
    </Card>
  );
}

// ─── Caffeine tracker ─────────────────────────────────────────
const CAFFEINE_PER_CUP = 80;
const CAFFEINE_LIMIT   = 400;

function CaffeineTracker({
  cups, onAdd, onRemove,
}: {
  cups:     number;
  onAdd:    () => void;
  onRemove: () => void;
}) {
  const totalMg  = cups * CAFFEINE_PER_CUP;
  const isOver   = totalMg > CAFFEINE_LIMIT;
  const color    = isOver ? '#ef4444' : totalMg >= 320 ? '#f59e0b' : '#d97706';
  const showCups = Math.min(Math.max(5, cups), 10);

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>☕</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Kofein</div>
            <div style={{ fontSize: 12, color: T.muted }}>{totalMg} / {CAFFEINE_LIMIT} mg</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onRemove}
            style={{ width: 30, height: 30, borderRadius: 8, background: T.border, border: 'none', color: T.text, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >−</button>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color, minWidth: 28, textAlign: 'center' }}>
            {cups}
          </span>
          <button
            onClick={onAdd}
            style={{ width: 30, height: 30, borderRadius: 8, background: color + '22', border: `1px solid ${color}44`, color, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >+</button>
        </div>
      </div>
      <ProgressBar value={totalMg} max={CAFFEINE_LIMIT} color={color} height={5} />
      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
        {Array.from({ length: showCups }).map((_, i) => (
          <span key={i} style={{ fontSize: 14, opacity: i < cups ? 1 : 0.2 }}>☕</span>
        ))}
      </div>
      <div style={{ fontSize: 11, color: isOver ? '#ef4444' : T.muted, marginTop: 4 }}>
        {cups} {cups === 1 ? 'espresso' : 'espressa'} · {totalMg} mg · limit: {CAFFEINE_LIMIT} mg/den{isOver ? ' ⚠️ Překročen!' : ''}
      </div>
    </Card>
  );
}

// ─── Training meal recommendation card ───────────────────────
function MealRecCard({ trainingType, accent, onAddAll }: {
  trainingType: string;
  accent:       string;
  onAddAll:     (items: Array<{ foodId: string; grams: number; slot: string }>) => Promise<void>;
}) {
  const rec = MEAL_RECS[trainingType as keyof typeof MEAL_RECS];
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  if (!rec || trainingType === 'rest') return null;

  // Calculate totals
  const totals = rec.items.reduce(
    (acc, item) => {
      const food = FOODS.find(f => f.id === item.foodId);
      if (!food) return acc;
      const factor = item.grams / 100;
      return {
        kcal:    acc.kcal    + food.kcal    * factor,
        carbs:   acc.carbs   + food.carbs   * factor,
        protein: acc.protein + food.protein * factor,
        fat:     acc.fat     + food.fat     * factor,
      };
    },
    { kcal: 0, carbs: 0, protein: 0, fat: 0 },
  );

  const handleAdd = async () => {
    setLoading(true);
    await onAddAll(rec.items);
    setLoading(false);
    setDone(true);
  };

  return (
    <Card style={{ marginBottom: 16, borderColor: accent + '44', background: accent + '0a' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>{rec.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: accent }}>{rec.title}</div>
          <div style={{ fontSize: 12, color: T.muted }}>{rec.description}</div>
        </div>
      </div>

      {/* Items list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {rec.items.map(item => {
          const food = FOODS.find(f => f.id === item.foodId);
          if (!food) return null;
          const factor = item.grams / 100;
          const itemKcal = Math.round(food.kcal * factor);
          return (
            <div key={item.foodId} style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
              fontSize:       13,
            }}>
              <span style={{ color: T.text }}>{food.name}</span>
              <span style={{ color: T.muted }}>
                {item.grams} g · <span style={{ color: accent, fontWeight: 600 }}>{itemKcal} kcal</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Macro totals */}
      <div style={{
        display:      'flex',
        gap:          8,
        marginBottom: 12,
        padding:      '8px 10px',
        background:   T.border + '55',
        borderRadius: 8,
      }}>
        {[
          { label: 'Kcal', value: Math.round(totals.kcal),    color: BRAND.gold   },
          { label: 'S',    value: Math.round(totals.carbs),   color: BRAND.gold   },
          { label: 'B',    value: Math.round(totals.protein), color: BRAND.green  },
          { label: 'T',    value: Math.round(totals.fat),     color: BRAND.orange },
        ].map(m => (
          <div key={m.label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 10, color: T.muted }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* CTA button */}
      {done ? (
        <div style={{
          textAlign:    'center',
          padding:      '10px',
          borderRadius: 10,
          background:   '#22c55e22',
          border:       '1px solid #22c55e44',
          color:        '#22c55e',
          fontSize:     13,
          fontWeight:   600,
        }}>
          ✓ Zapsáno do deníku!
        </div>
      ) : (
        <Btn
          accent={accent}
          size="md"
          full
          onClick={handleAdd}
          disabled={loading}
        >
          {loading ? 'Zapisuji…' : '📋 Zapsat do deníku'}
        </Btn>
      )}
    </Card>
  );
}

// ─── Dashboard page ──────────────────────────────────────────
export default function Dashboard() {
  const ctx      = useContext(AppContext);
  const navigate = useNavigate();
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

  const {
    accent, totals, goals, goalOverride, setGoalOverride,
    trainingDay, upsertTrainingDay,
    entries, userId, today, addEntry, profile,
    deficitLevel,
  } = ctx;

  const deficitKcal = DEFICIT_KCAL[deficitLevel] ?? 0;
  const { data: historyData } = useWeeklyData(userId, 14, profile, goals.kcal, deficitKcal);
  const { activities: intervalsActivities } = useIntervalsData(1, userId);
  const { todayWorkout } = useTrainingPlan();

  const allTypes   = trainingDay ? [trainingDay.training_type, ...(trainingDay.extra_types ?? [])] : ['rest'];
  const primary    = primaryType(allTypes as any);
  const training   = TRAINING_TYPES.find(t => t.id === (trainingDay?.training_type ?? 'rest'))!;

  const handleWaterAdd    = () => upsertTrainingDay({ water_glasses: (trainingDay?.water_glasses ?? 0) + 1 });
  const handleWaterRemove = () => upsertTrainingDay({ water_glasses: Math.max(0, (trainingDay?.water_glasses ?? 0) - 1) });
  const handleCoffeeAdd    = () => upsertTrainingDay({ coffee_cups: (trainingDay?.coffee_cups ?? 0) + 1 });
  const handleCoffeeRemove = () => upsertTrainingDay({ coffee_cups: Math.max(0, (trainingDay?.coffee_cups ?? 0) - 1) });

  const noEntries = entries.length === 0;
  const topMicros = MICRO_META.slice(0, 6);

  // Handle adding all meal recommendation items to food log
  const handleAddMealRec = async (items: Array<{ foodId: string; grams: number; slot: string }>) => {
    for (const item of items) {
      const food = FOODS.find(f => f.id === item.foodId);
      if (!food || !userId) continue;
      const factor = item.grams / 100;
      await addEntry({
        user_id:    userId,
        date:       today,
        meal_slot:  item.slot,
        food_id:    food.id,
        food_name:  food.name,
        grams:      item.grams,
        kcal:       Math.round(food.kcal    * factor),
        carbs:      Math.round(food.carbs   * factor * 10) / 10,
        protein:    Math.round(food.protein * factor * 10) / 10,
        fat:        Math.round(food.fat     * factor * 10) / 10,
        na:         Math.round(food.micros.na     * factor),
        k:          Math.round(food.micros.k      * factor),
        mg:         Math.round(food.micros.mg     * factor),
        ca:         Math.round(food.micros.ca     * factor),
        fe:         Math.round(food.micros.fe     * factor * 10) / 10,
        vit_c:      Math.round(food.micros.vit_c  * factor),
        vit_d:      Math.round(food.micros.vit_d  * factor * 10) / 10,
        b12:        Math.round(food.micros.b12    * factor * 100) / 100,
        omega3:     Math.round(food.micros.omega3 * factor),
        zn:         Math.round(food.micros.zn     * factor * 10) / 10,
      });
    }
  };

  // History stats
  const daysWithData  = historyData.filter(d => d.kcal > 0);
  const avgKcal       = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + d.kcal, 0) / daysWithData.length)
    : 0;

  const pctGoal = goals.kcal > 0 ? Math.round((totals.kcal / goals.kcal) * 100) : 0;

  const trainingBanner = training.id !== 'rest' ? (
    <div
      className="stagger-1"
      onClick={() => navigate('/plan')}
      style={{
        background: 'linear-gradient(135deg, #FFD600, #FFA800)',
        borderRadius: 14, padding: '14px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, color: '#000', cursor: 'pointer',
        animation: 'pulse-glow 3s ease-in-out infinite',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, background: 'rgba(0,0,0,0.15)',
          borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>
          {training.icon}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.5px' }}>
            DNES: {training.label.toUpperCase()}
          </div>
          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>Klikni pro aktivity</div>
        </div>
      </div>
      <span style={{ fontSize: 18, fontWeight: 800 }}>›</span>
    </div>
  ) : null;

  const mealRecommendation = primary !== 'rest' ? (
    <>
      <SectionTitle accent={BRAND.gold}>Co si vzít s sebou?</SectionTitle>
      <MealRecCard trainingType={primary} accent={accent} onAddAll={handleAddMealRec} />
      <Card
        onClick={() => navigate('/plan')}
        style={{
          marginBottom: 16,
          borderColor: BRAND.blue + '33',
          background: 'linear-gradient(135deg, rgba(79,195,247,0.10), rgba(255,214,0,0.05))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: BRAND.blue, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>
              Fueling Lab
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>
              Otevřít 3 fáze plánování
            </div>
            <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.55 }}>
              Nutriční plán na dnešní trénink, carbs/h, meal builder, fueling score i recovery debt na jednom místě.
            </div>
          </div>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: BRAND.blue + '18',
            border: `1px solid ${BRAND.blue}33`,
            color: BRAND.blue,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 18,
            fontWeight: 800,
          }}>
            →
          </div>
        </div>
      </Card>
    </>
  ) : null;

  const hydrationSection = (
    <>
      <SectionTitle accent={BRAND.gold}>Hydratace & stimulanty</SectionTitle>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? 'repeat(2, minmax(0, 1fr))' : '1fr',
        gap: 10,
        marginBottom: 16,
      }}>
        <WaterTracker
          glasses={trainingDay?.water_glasses ?? 0}
          goalLitres={goals.water}
          accent={BRAND.blue}
          onAdd={handleWaterAdd}
          onRemove={handleWaterRemove}
        />
        <CaffeineTracker
          cups={trainingDay?.coffee_cups ?? 0}
          onAdd={handleCoffeeAdd}
          onRemove={handleCoffeeRemove}
        />
      </div>
    </>
  );

  const historySection = (
    <>
      <SectionTitle
        accent={BRAND.gold}
        right={<span style={{ fontSize: 11, color: T.muted }}>14 dní</span>}
      >
        Historie kalorií
      </SectionTitle>
      <Card style={{ marginBottom: daysWithData.length > 0 ? 8 : 16, padding: '14px 12px 10px' }}>
        {historyData.length > 0 ? (
          <>
            <HistoryChart data={historyData} accent={accent} kcalGoal={goals.kcal} />
            {historyData.some(d => d.burned > 0) && (
              <div style={{ display: 'flex', gap: 14, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.muted }}>
                  <div style={{ width: 14, height: 4, borderRadius: 2, background: accent + '88' }} />
                  Příjem
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.muted }}>
                  <div style={{ width: 14, height: 2, borderRadius: 1, background: '#FF6B35' }} />
                  Výdej (BMR + aktivita)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.muted }}>
                  <div style={{ width: 14, height: 0, borderTop: `1.5px dashed ${accent}aa` }} />
                  Cíl
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: T.muted, fontSize: 13 }}>
            Načítám data…
          </div>
        )}
      </Card>
      {daysWithData.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Průměr / den', value: `${avgKcal} kcal`, color: BRAND.gold },
            { label: 'Aktivní dny',  value: `${daysWithData.length} / 14`, color: T.muted },
            { label: 'Cíl dnes',     value: `${Math.round(goals.kcal)} kcal`, color: T.muted },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: '8px 10px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              <div style={{ fontSize: 9, color: T.muted, marginTop: 2, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const microsSection = (
    <>
      <SectionTitle
        accent={BRAND.gold}
        right={
          <button
            onClick={() => navigate('/micros')}
            style={{ background: 'none', border: 'none', color: BRAND.gold, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
          >
            Detail →
          </button>
        }
      >
        Mikronutrienty
      </SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        {topMicros.map((m, i) => {
          const val  = totals[m.key as keyof typeof totals] as number;
          const goal = goals.micros[m.key] ?? m.base;
          const pct  = goal > 0 ? Math.min(100, (val / goal) * 100) : 0;
          return (
            <div key={m.key} style={{
              paddingBottom: i < topMicros.length - 1 ? 10 : 0,
              marginBottom:  i < topMicros.length - 1 ? 10 : 0,
              borderBottom:  i < topMicros.length - 1 ? `1px solid ${T.border}` : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: T.text }}>{m.label}</span>
                <span style={{ fontSize: 12, color: T.muted }}>
                  {val.toFixed(m.unit === 'µg' ? 1 : 0)} / {goal.toFixed(m.unit === 'µg' ? 1 : 0)} {m.unit}
                  <span style={{ marginLeft: 6, color: pct >= 100 ? BRAND.green : T.muted }}>{pct.toFixed(0)}%</span>
                </span>
              </div>
              <ProgressBar value={val} max={goal} color={m.color} height={4} />
            </div>
          );
        })}
      </Card>
    </>
  );

  const emptyStateSection = noEntries ? (
    <div style={{
      background: 'linear-gradient(135deg, #0f0f0f, #0a0a0a)',
      border: `1px solid rgba(255,214,0,0.15)`,
      borderRadius: 18, padding: 24, marginBottom: 16, textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(255,214,0,0.04), transparent)',
        pointerEvents: 'none',
      }} />
      <div style={{ fontSize: 36, marginBottom: 8 }}>🍽️</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 6 }}>
        Zatím žádná jídla
      </div>
      <div style={{ fontSize: 14, color: T.muted, marginBottom: 16 }}>
        Začni sledovat svůj nutriční příjem a plň denní cíle.
      </div>
      <button
        onClick={() => navigate('/foods')}
        style={{
          width: '100%', background: 'linear-gradient(135deg, #FFD600, #FFA800)',
          color: '#000', border: 'none', padding: '13px', borderRadius: 12,
          fontSize: 12, fontWeight: 800, letterSpacing: '1.5px',
          textTransform: 'uppercase' as const, cursor: 'pointer',
        }}
      >
        + Přidat první jídlo
      </button>
    </div>
  ) : null;

  const tipsSection = (
    <>
      <SectionTitle accent={BRAND.gold}>Tipy pro dnešek</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        {training.tips.map((tip, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            paddingBottom: i < training.tips.length - 1 ? 10 : 0,
            marginBottom:  i < training.tips.length - 1 ? 10 : 0,
            borderBottom:  i < training.tips.length - 1 ? `1px solid ${T.border}` : 'none',
          }}>
            <span style={{ color: BRAND.gold, fontSize: 14, marginTop: 1 }}>◆</span>
            <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{tip}</span>
          </div>
        ))}
      </Card>
    </>
  );

  return (
    <div style={{ padding: isDesktop ? '0 0 12px' : '16px 16px 0', position: 'relative' }}>

      {/* Gradient overlay at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 300,
        background: 'radial-gradient(ellipse at top, rgba(255,214,0,0.06), transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Content wrapper above overlay */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {isDesktop ? (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 0.65fr)',
              gap: 20,
              alignItems: 'start',
              marginBottom: 18,
            }}>
              <div>
                <StretchingChecklist userId={userId} today={today} accent={accent} />

                <div className="stagger-2" style={{
                  background: 'linear-gradient(180deg, #0f0f0f, #080808)',
                  border: '1px solid #181818',
                  borderRadius: 26, padding: '30px 24px 24px',
                  marginBottom: 16, textAlign: 'center',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
                    background: 'radial-gradient(circle at center, rgba(255,214,0,0.04) 0%, transparent 40%)',
                    pointerEvents: 'none',
                  }} />
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(240px, 320px) minmax(0, 1fr)',
                    gap: 24,
                    alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <ProgressRing value={totals.kcal} max={goals.kcal} size={240}>
                        <div style={{
                          fontSize: 50, fontWeight: 800, letterSpacing: '-2px', lineHeight: 1,
                          background: 'linear-gradient(180deg, #fff 40%, #888)',
                          WebkitBackgroundClip: 'text', backgroundClip: 'text',
                          WebkitTextFillColor: 'transparent', fontVariantNumeric: 'tabular-nums',
                          textAlign: 'center',
                        }}>
                          {Math.round(totals.kcal)}
                        </div>
                        <div style={{
                          fontSize: 10, color: T.muted, letterSpacing: '2px',
                          textTransform: 'uppercase' as const, marginTop: 6, textAlign: 'center',
                        }}>
                          kcal příjem
                        </div>
                        <div style={{
                          fontSize: 11, color: BRAND.gold, marginTop: 10, fontWeight: 600,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', background: 'rgba(255,214,0,0.1)', borderRadius: 10,
                        }}>
                          {pctGoal}% cíle
                        </div>
                      </ProgressRing>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, color: T.muted, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10 }}>
                        Denní výkon
                      </div>
                      <div style={{ fontSize: 34, fontWeight: 800, color: T.text, letterSpacing: '-0.05em', marginBottom: 6 }}>
                        {Math.max(0, Math.round(goals.kcal - totals.kcal))} kcal zbývá
                      </div>
                      <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.6, marginBottom: 18 }}>
                        Desktop přehled teď zvýrazňuje energii, makra a historii jako pracovní cockpit pro rychlé rozhodování během dne.
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                        {[
                          { label: 'Zbývá',   value: Math.max(0, Math.round(goals.kcal - totals.kcal)), unit: 'kcal' },
                          { label: 'Cíl',     value: Math.round(goals.kcal), unit: 'kcal' },
                          { label: 'Splněno', value: pctGoal, unit: '%' },
                        ].map(s => (
                          <div key={s.label} style={{
                            background: T.bg, borderRadius: 12,
                            padding: '10px 12px', textAlign: 'left',
                            position: 'relative',
                          }}>
                            {s.label === 'Cíl' && goalOverride && (
                              <button
                                onClick={() => setGoalOverride(null)}
                                title="Obnovit výchozí cíle"
                                style={{
                                  position: 'absolute', top: 6, right: 6,
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: BRAND.gold, fontSize: 13, lineHeight: 1, padding: 0, opacity: 0.8,
                                }}
                              >
                                ↺
                              </button>
                            )}
                            <div style={{
                              fontSize: 18, fontWeight: 700, color: BRAND.gold,
                              fontVariantNumeric: 'tabular-nums', marginBottom: 4,
                            }}>
                              {s.value}
                              <span style={{ fontSize: 10, color: T.muted, marginLeft: 4 }}>{s.unit}</span>
                            </div>
                            <div style={{
                              fontSize: 10, color: T.muted,
                              textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                            }}>
                              {s.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <SectionTitle accent={BRAND.gold}>Makroživiny</SectionTitle>
                <div className="stagger-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                  <MacroCard label="Sach."  value={totals.carbs}   target={goals.carbs}   unit="g" color={BRAND.gold}   />
                  <MacroCard label="Bílk."  value={totals.protein} target={goals.protein} unit="g" color={BRAND.green}  />
                  <MacroCard label="Tuky"   value={totals.fat}     target={goals.fat}     unit="g" color={BRAND.orange} />
                </div>

                {(() => {
                  const fv   = Math.round(totals.fiber * 10) / 10;
                  const fg   = goals.fiber;
                  const done = fv >= fg;
                  return (
                    <div style={{
                      background: T.card, border: `1px solid ${T.border}`,
                      borderRadius: 12, padding: '10px 14px', marginBottom: 16,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const }}>
                          Vláknina
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: done ? BRAND.green : T.text }}>
                          {fv} <span style={{ fontWeight: 400, color: T.muted, fontSize: 11 }}>/ {fg} g</span>
                          {done && <span style={{ marginLeft: 6, fontSize: 11, color: BRAND.green }}>✓</span>}
                        </span>
                      </div>
                      <ProgressBar value={fv} max={fg} color={BRAND.green} height={4} />
                    </div>
                  );
                })()}

                {historySection}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {trainingBanner}

                <Card style={{
                  padding: 18,
                  borderRadius: 20,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
                }}>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>
                    Rychlý přehled
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {[
                      { label: 'Průměr 14 dní', value: avgKcal > 0 ? `${avgKcal} kcal` : '—', color: BRAND.gold },
                      { label: 'Aktivní dny', value: `${daysWithData.length} / 14`, color: T.text },
                      { label: 'Typ dne', value: training.label, color: accent },
                    ].map(item => (
                      <div key={item.label} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingBottom: 10,
                        borderBottom: `1px solid ${T.border}`,
                      }}>
                        <span style={{ fontSize: 12, color: T.muted }}>{item.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <IntervalsCard />
                {mealRecommendation}
                {hydrationSection}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.9fr)', gap: 20, alignItems: 'start' }}>
              <div>
                {microsSection}
                {emptyStateSection}
              </div>
              <div>
                {tipsSection}
              </div>
            </div>
          </>
        ) : (
          <>
            {trainingBanner}
            <StretchingChecklist userId={userId} today={today} accent={accent} />

            <div className="stagger-2" style={{
              background: 'linear-gradient(180deg, #0f0f0f, #080808)',
              border: '1px solid #181818',
              borderRadius: 22, padding: '24px 20px 20px',
              marginBottom: 16, textAlign: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
          <div style={{
            position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
            background: 'radial-gradient(circle at center, rgba(255,214,0,0.04) 0%, transparent 40%)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
            <ProgressRing value={totals.kcal} max={goals.kcal} size={210}>
              <div style={{
                fontSize: 44, fontWeight: 800, letterSpacing: '-2px', lineHeight: 1,
                background: 'linear-gradient(180deg, #fff 40%, #888)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text',
                WebkitTextFillColor: 'transparent', fontVariantNumeric: 'tabular-nums',
                textAlign: 'center',
              }}>
                {Math.round(totals.kcal)}
              </div>
              <div style={{
                fontSize: 10, color: T.muted, letterSpacing: '2px',
                textTransform: 'uppercase' as const, marginTop: 6, textAlign: 'center',
              }}>
                kcal příjem
              </div>
              <div style={{
                fontSize: 11, color: BRAND.gold, marginTop: 10, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', background: 'rgba(255,214,0,0.1)', borderRadius: 10,
              }}>
                {pctGoal}% cíle
              </div>
            </ProgressRing>
          </div>

          {/* Stats below ring */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {[
              { label: 'Zbývá',   value: Math.max(0, Math.round(goals.kcal - totals.kcal)), unit: 'kcal' },
              { label: 'Cíl',     value: Math.round(goals.kcal), unit: 'kcal' },
              { label: 'Splněno', value: pctGoal, unit: '%' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: T.bg, borderRadius: 8,
                padding: '6px 8px', textAlign: 'center',
                position: 'relative',
              }}>
                {/* Reset button — visible only on 'Cíl' tile when override is active */}
                {s.label === 'Cíl' && goalOverride && (
                  <button
                    onClick={() => setGoalOverride(null)}
                    title="Obnovit výchozí cíle"
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: BRAND.gold, fontSize: 13, lineHeight: 1, padding: 0,
                      opacity: 0.8,
                    }}
                  >
                    ↺
                  </button>
                )}
                <div style={{
                  fontSize: 13, fontWeight: 700, color: BRAND.gold,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {s.value}
                  <span style={{ fontSize: 9, color: T.muted, marginLeft: 2 }}>{s.unit}</span>
                </div>
                <div style={{
                  fontSize: 9, color: T.muted,
                  textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginTop: 2,
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Macro 3-column grid */}
        <SectionTitle accent={BRAND.gold}>Makroživiny</SectionTitle>
        <div className="stagger-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
          <MacroCard label="Sach."  value={totals.carbs}   target={goals.carbs}   unit="g" color={BRAND.gold}   />
          <MacroCard label="Bílk."  value={totals.protein} target={goals.protein} unit="g" color={BRAND.green}  />
          <MacroCard label="Tuky"   value={totals.fat}     target={goals.fat}     unit="g" color={BRAND.orange} />
        </div>

        {/* Fiber bar */}
        {(() => {
          const fv   = Math.round(totals.fiber * 10) / 10;
          const fg   = goals.fiber;
          const done = fv >= fg;
          return (
            <div style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 12, padding: '10px 14px', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const }}>
                  Vláknina
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: done ? BRAND.green : T.text }}>
                  {fv} <span style={{ fontWeight: 400, color: T.muted, fontSize: 11 }}>/ {fg} g</span>
                  {done && <span style={{ marginLeft: 6, fontSize: 11, color: BRAND.green }}>✓</span>}
                </span>
              </div>
              <ProgressBar value={fv} max={fg} color={BRAND.green} height={4} />
            </div>
          );
        })()}

        {/* Intervals.icu card */}
        <IntervalsCard />

        {/* Today's planned workout from TrainingPeaks */}
        {todayWorkout && (
          <div style={{
            background: BRAND.purple + '0e', border: `1px solid ${BRAND.purple}33`,
            borderRadius: 14, padding: '12px 16px', marginBottom: 14,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{tpSportIcon(todayWorkout.sportType)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: BRAND.purple, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Dnešní plán
                </span>
                {todayWorkout.durationMin > 0 && (
                  <span style={{ fontSize: 10, color: T.muted }}>
                    ⏱ {todayWorkout.durationMin >= 60
                      ? `${Math.floor(todayWorkout.durationMin / 60)}h${todayWorkout.durationMin % 60 > 0 ? ` ${todayWorkout.durationMin % 60}min` : ''}`
                      : `${todayWorkout.durationMin} min`}
                  </span>
                )}
                {todayWorkout.tss > 0 && (
                  <span style={{ fontSize: 10, color: T.muted }}>· TSS {todayWorkout.tss}</span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {todayWorkout.title}
              </div>
              <div style={{ fontSize: 11, color: BRAND.green, lineHeight: 1.55 }}>
                {workoutNutritionTip(todayWorkout)}
              </div>
            </div>
          </div>
        )}

        {/* Post-workout protein timing alert */}
        <TrainingTimingCard
          activities={intervalsActivities}
          goals={{ protein: goals.protein, carbs: goals.carbs }}
        />

        {/* Electrolytes for long rides */}
        <ElectrolyteCard
          rideHours={trainingDay?.ride_hours ?? 0}
          totals={{ na: totals.na, k: totals.k, mg: totals.mg }}
          goals={{ na: goals.micros['na'] ?? 1500, k: goals.micros['k'] ?? 3500, mg: goals.micros['mg'] ?? 350 }}
        />

        {/* Training meal recommendation */}
        {mealRecommendation}

        {/* Water + Caffeine trackers */}
        {hydrationSection}

        {/* 14-day history */}
        {historySection}

        {/* Weekly summary */}
        <SectionTitle accent={BRAND.gold}>Týdenní přehled</SectionTitle>
        <WeeklySummaryCard historyData={historyData} accent={accent} />

        {/* Micros preview */}
        {microsSection}

        {/* CTA if no entries */}
        {emptyStateSection}

        {/* Training tips */}
        {tipsSection}
          </>
        )}

      </div>
    </div>
  );
}
