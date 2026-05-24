import { useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext, DEFICIT_KCAL }  from '../App';
import { T, BRAND, MACRO, ProgressBar, SectionTitle, Card, Btn, LiveBadge } from '../components/UI';
import { Ring, SegRing, MacroLine, KV } from '../components/primitives';
import { MICRO_META, TRAINING_TYPES, MEAL_RECS, primaryType } from '../constants/training';
import { getDuringCarbRange, calcFuelingScore } from '../utils/fuelingScore';
import { FOODS } from '../constants/foods';
import { useWeeklyData } from '../hooks/useWeeklyData';
import { useSupplements } from '../hooks/useSupplements';
import { SUPPLEMENTS } from '../constants/supplements';
import { useWhoopData } from '../hooks/useWhoopData';
import { useIntervalsData } from '../hooks/useIntervalsData';
import { IntervalsCard } from '../components/IntervalsCard';
import { useTrainingPlan } from '../hooks/useTrainingPlan';
import { WeekChart, TrainingBanner } from '../components/PerformanceCards';
import { PriorityCard } from '../components/performance-ui/PriorityCard';
import { ScoreRing } from '../components/performance-ui/ScoreRing';
import { RecoveryDebtCard } from '../components/performance-ui/RecoveryDebtCard';
import { PhaseIndicator } from '../components/performance-ui/PhaseIndicator';
import { useTrainingPhase } from '../hooks/useTrainingPhase';
import { useDailyNutritionTarget } from '../hooks/useDailyNutritionTarget';


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

// ─── Water tracker ───────────────────────────────────────────
function WaterTracker({
  glasses, goalLitres, accent, onAddMl, onRemove,
}: {
  glasses:    number;
  goalLitres: number;
  accent:     string;
  onAddMl:    (ml: number) => void;
  onRemove:   () => void;
}) {
  const totalMl = glasses * 250;
  const goalMl  = Math.round(goalLitres * 1000);
  const done    = totalMl >= goalMl;
  const dispVal = totalMl >= 1000 ? (totalMl / 1000).toFixed(1) : String(totalMl);
  const dispUnit = totalMl >= 1000 ? 'L' : 'ml';

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 14px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: T.muted, marginBottom: 4 }}>
            HYDRATACE
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const, color: done ? BRAND.green : T.text, lineHeight: 1 }}>
              {dispVal}
            </span>
            <span style={{ fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
              {dispUnit} / {goalLitres} L
            </span>
            {done && <span style={{ fontSize: 11, color: BRAND.green, fontWeight: 700 }}>✓</span>}
          </div>
        </div>
        <button
          onClick={onRemove}
          disabled={glasses === 0}
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'transparent', border: `1px solid ${T.border}`,
            color: glasses === 0 ? T.muted : T.text,
            fontSize: 18, cursor: glasses === 0 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: glasses === 0 ? 0.3 : 1,
          }}
        >−</button>
      </div>
      <ProgressBar value={totalMl} max={goalMl} color={accent} height={4} />
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {[250, 500, 750].map(ml => (
          <button
            key={ml}
            onClick={() => onAddMl(ml)}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 10,
              background: accent + '14', border: `1px solid ${accent}33`,
              color: accent, fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >+{ml}</button>
        ))}
      </div>
    </div>
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
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 14px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: T.muted, marginBottom: 4 }}>
            KOFEIN
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const, color: isOver ? '#ef4444' : T.text, lineHeight: 1 }}>
              {totalMg}
            </span>
            <span style={{ fontSize: 11, color: isOver ? '#ef4444' : T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
              mg / {CAFFEINE_LIMIT} mg{isOver ? ' !' : ''}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onRemove}
            disabled={cups === 0}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'transparent', border: `1px solid ${T.border}`,
              color: cups === 0 ? T.muted : T.text,
              fontSize: 18, cursor: cups === 0 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: cups === 0 ? 0.3 : 1,
            }}
          >−</button>
          <button
            onClick={onAdd}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: color + '14', border: `1px solid ${color}33`,
              color, fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700,
            }}
          >+</button>
        </div>
      </div>
      <ProgressBar value={totalMg} max={CAFFEINE_LIMIT} color={color} height={4} />
      <div style={{ fontSize: 10, color: T.muted, marginTop: 8, fontFamily: 'JetBrains Mono, monospace' }}>
        {cups} {cups === 1 ? 'espresso' : 'espressa'} · {CAFFEINE_PER_CUP} mg/šálek
      </div>
    </div>
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
    entries, userId, today, setToday, addEntry, profile,
    deficitLevel, burnedToday,
  } = ctx;

  const realToday = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const isViewingToday = today === realToday;
  const shiftDay = (delta: number) => {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setToday(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  };

  const deficitKcal = DEFICIT_KCAL[deficitLevel] ?? 0;
  const { data: historyData } = useWeeklyData(userId, 14, profile, goals.kcal, deficitKcal);
  const { activities: intervalsActivities } = useIntervalsData(1, userId);
  const { todayWorkout } = useTrainingPlan();
  const { takenCount: suppTaken } = useSupplements(userId, today);
  const totalSupplements = SUPPLEMENTS.length;
  useWhoopData();
  const { phaseInfo, nextRace } = useTrainingPhase(userId);

  // TSS for today: prefer synced Intervals.icu load, fall back to planned TSS from TrainingPeaks
  const todayTSS = intervalsActivities
    .filter(a => a.start_date_local.startsWith(today))
    .reduce((sum, a) => sum + (a.icu_training_load ?? 0), 0)
    || (todayWorkout?.tss ?? 0);

  const { target: nutritionTarget } = useDailyNutritionTarget({
    profile,
    phaseInfo,
    tss: todayTSS,
    garminKj: null,
    caloricDeficit: deficitKcal,
  });

  // Phase-adjusted goals: use computed targets when available, fall back to AppContext goals
  const effectiveGoals = nutritionTarget ? {
    ...goals,
    kcal:    nutritionTarget.kcal,
    carbs:   nutritionTarget.carbs_g,
    protein: nutritionTarget.protein_g,
    fat:     nutritionTarget.fat_g,
  } : goals;

  // Phase-based accent color (falls back to user accent)
  const phaseAccent = phaseInfo?.color ?? accent;

  // Czech greeting date
  const DAYS_CZ = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
  const todayDate = new Date(today + 'T12:00:00');
  const dayNameCz = DAYS_CZ[todayDate.getDay()].toUpperCase();
  const dateLabelCz = `${todayDate.getDate()}. ${todayDate.getMonth() + 1}.`;

  // Streak: consecutive days with food entries, counting backwards from today
  const streak = (() => {
    const sorted = [...historyData].sort((a, b) => b.date?.localeCompare(a.date ?? '') ?? 0);
    let count = 0;
    for (const d of sorted) {
      if ((d.kcal ?? 0) > 0) count++;
      else break;
    }
    return count || (entries.length > 0 ? 1 : 0);
  })();

  // Use DB record when it has an id (user set it manually); otherwise fall back to calendar workout
  const allTypes = trainingDay?.id
    ? [trainingDay.training_type, ...(trainingDay.extra_types ?? [])]
    : todayWorkout ? [todayWorkout.sportType] : ['rest'];
  const primary  = primaryType(allTypes as any);
  const training = TRAINING_TYPES.find(t => t.id === primary) ?? TRAINING_TYPES.find(t => t.id === 'rest')!;

  const handleWaterAddMl  = (ml: number) => upsertTrainingDay({ water_glasses: (trainingDay?.water_glasses ?? 0) + Math.round(ml / 250) });
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

  const pctGoal = effectiveGoals.kcal > 0 ? Math.round((totals.kcal / effectiveGoals.kcal) * 100) : 0;


  const postWorkoutProtein = entries
    .filter(entry => entry.meal_slot === 'po_tren')
    .reduce((sum, entry) => sum + entry.protein, 0);
  const duringCarbs = entries
    .filter(entry => entry.meal_slot === 'behem_tren')
    .reduce((sum, entry) => sum + entry.carbs, 0);
  const allHoursForScore = trainingDay ? (trainingDay.ride_hours ?? 0) : 0;
  const carbRange = getDuringCarbRange(primary as Parameters<typeof getDuringCarbRange>[0], allHoursForScore);
  const fuelingScore = calcFuelingScore({
    totals,
    goals: effectiveGoals,
    waterGlasses:       trainingDay?.water_glasses ?? 0,
    totalHours:         allHoursForScore,
    duringCarbs,
    carbRange,
    postWorkoutProtein,
  });
  const recentRecoveryDebt = Math.round(
    historyData.slice(-4, -1).reduce((sum, day) => sum + Math.max(0, day.goal - day.kcal), 0),
  );
  const liveActivity = intervalsActivities.find(activity => {
    const start = new Date(activity.start_date_local).getTime();
    const end = start + activity.moving_time * 1000;
    const now = Date.now();
    return activity.start_date_local.startsWith(today) && now >= start && now <= end;
  });
  const liveElapsedMin = liveActivity
    ? Math.max(1, Math.round((Date.now() - new Date(liveActivity.start_date_local).getTime()) / 60_000))
    : 0;


  const allHours = allHoursForScore;
  const trainingBanner = training.id !== 'rest' ? (
    <div className="stagger-1" onClick={() => navigate('/plan')} style={{ cursor: 'pointer', marginBottom: 16 }}>
      <TrainingBanner
        trainingLabel={training.label}
        trainingIcon={training.icon}
        totalHours={allHours}
        accent={accent}
        message={training.tips[0] ?? 'Klikni pro detailní plán výkonu a fueling.'}
        usingTP={false}
      />
    </div>
  ) : null;

  const performanceMetricsSection = (
    <>
      <SectionTitle accent={BRAND.blue}>Performance Lab</SectionTitle>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? 'minmax(0, 0.9fr) minmax(0, 1.1fr)' : '1fr 1fr',
        gap: 10,
        marginBottom: 16,
      }}>
        <Card style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 142,
          borderColor: BRAND.gold + '33',
          background: 'linear-gradient(135deg, rgba(124,92,255,0.06), #0E0E14)',
        }}>
          <ScoreRing score={fuelingScore} label="FUELING SCORE" />
        </Card>
        <RecoveryDebtCard
          debt={recentRecoveryDebt}
          context={recentRecoveryDebt > 0 ? 'Akumulováno z posledních dní' : 'Stabilní bilance'}
          recommendation={
            recentRecoveryDebt > 900
              ? 'Dnes drž sacharidy i protein výš a nepodceň post-workout jídlo.'
              : 'Energetický dluh je pod kontrolou. Stačí držet dnešní plán.'
          }
        />
      </div>
      <PriorityCard
        priorities={[
          {
            number: 1,
            text: primary !== 'rest'
              ? 'Otevři Lab a zkontroluj carbs/h pro dnešní trénink.'
              : 'Drž jednoduchý příjem a nepřestřel tuky v odpočinkový den.',
            color: 'action',
          },
          {
            number: 2,
            text: `${Math.max(0, Math.round(effectiveGoals.protein - totals.protein))} g proteinu zbývá do denního cíle.`,
            color: 'success',
          },
          {
            number: 3,
            text: `${trainingDay?.water_glasses ?? 0} / ${Math.round(goals.water * 4)} sklenic vody zatím splněno.`,
            color: 'analytics',
          },
        ]}
      />
    </>
  );

  const liveModeSection = liveActivity ? (
    <Card style={{
      marginBottom: 16,
      borderColor: 'rgba(124,92,255,0.35)',
      background: 'linear-gradient(135deg, rgba(124,92,255,0.10), rgba(7,7,10,0.98))',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <LiveBadge />
            <span style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>During training</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>{liveActivity.name}</div>
          <div style={{ fontSize: 12, color: T.muted }}>{liveElapsedMin} min elapsed · sleduj příjem během výkonu</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: BRAND.orange, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(liveActivity.calories ?? 0)}
          </div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>kcal burn</div>
        </div>
      </div>
      <PriorityCard
        priorities={[
          { number: 1, text: 'Každých 15-20 min zkontroluj pití a sacharidy.', color: 'action' },
          { number: 2, text: 'Po tréninku zapiš recovery meal do slotu Po tréninku.', color: 'success' },
          { number: 3, text: 'Detailní carbs/h tracking otevřeš v Labu.', color: 'analytics' },
        ]}
      />
    </Card>
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
          background: 'linear-gradient(135deg, rgba(79,227,255,0.10), rgba(124,92,255,0.05))',
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
      {isDesktop && <SectionTitle accent={BRAND.gold}>Hydratace & stimulanty</SectionTitle>}
      {!isDesktop && (
        <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: T.muted, fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>
          STIMULANTY
        </div>
      )}
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
          onAddMl={handleWaterAddMl}
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
      <Card style={{ marginBottom: daysWithData.length > 0 ? 8 : 16, padding: '14px 12px 10px', animation: 'cardReveal 0.5s ease-out 0.4s both' }}>
        {historyData.length > 0 ? (
          <>
            <WeekChart data={historyData} accent={accent} kcalGoal={effectiveGoals.kcal} />
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
            { label: 'Cíl dnes',     value: `${Math.round(effectiveGoals.kcal)} kcal`, color: T.muted },
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
      background: 'linear-gradient(135deg, #11111A, #0E0E14)',
      border: `1px solid rgba(124,92,255,0.15)`,
      borderRadius: 18, padding: 24, marginBottom: 16, textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(124,92,255,0.04), transparent)',
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
          width: '100%', background: 'linear-gradient(135deg, #7C5CFF, #4FE3FF)',
          color: '#fff', border: 'none', padding: '13px', borderRadius: 12,
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

      {/* Gradient overlay at top — tinted by current phase */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 300,
        background: `radial-gradient(ellipse at top, ${phaseAccent}0f, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
        transition: 'background 0.5s ease',
      }} />

      {/* Content wrapper above overlay */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Phase banner ──────────────────────────────────── */}
        {phaseInfo && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 14,
            padding: '8px 14px',
            borderRadius: 10,
            background: phaseAccent + '18',
            border: `1px solid ${phaseAccent}44`,
          }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>{phaseInfo.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: phaseAccent, letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontFamily: 'JetBrains Mono, monospace' }}>
                {phaseInfo.label}
              </span>
              {phaseInfo.tip && (
                <span style={{ fontSize: 11, color: T.muted, marginLeft: 8 }}>{phaseInfo.tip}</span>
              )}
            </div>
            {nutritionTarget && (
              <span style={{ fontSize: 10, color: phaseAccent, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, flexShrink: 0 }}>
                {Math.round(nutritionTarget.kcal)} kcal
              </span>
            )}
          </div>
        )}

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

                {/* ── Desktop: Energy balance + Macros row ── */}
                <div className="stagger-2" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
                  {/* Energy balance */}
                  <div style={{
                    background: T.card, border: `1px solid ${T.border}`,
                    borderRadius: 14, padding: 28, position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                        Energetická bilance
                      </span>
                      {pctGoal >= 80 ? (
                        <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(125,216,122,0.12)', color: BRAND.green, borderRadius: 3, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>NA CESTĚ</span>
                      ) : (
                        <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(124,92,255,0.12)', color: BRAND.purple, borderRadius: 3, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>PLNÍ SE</span>
                      )}
                    </div>
                    {(() => {
                        const balance = burnedToday > 0 ? burnedToday - Math.round(totals.kcal) : Math.round(effectiveGoals.kcal + deficitKcal - totals.kcal);
                        const balanceColor = balance > 200 ? BRAND.green : balance < -200 ? BRAND.red : BRAND.orange;
                        return (
                          <>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 6 }}>
                              <span style={{
                                fontFamily: "'Space Grotesk', Inter, sans-serif",
                                fontSize: 80, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 0.9,
                                color: balanceColor, fontVariantNumeric: 'tabular-nums',
                              }}>
                                {balance > 0 ? '+' : ''}{balance.toLocaleString('cs')}
                              </span>
                              <span style={{ fontSize: 14, color: T.text2 }}>kcal bilance</span>
                            </div>
                            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
                              zbývá do cíle: <span style={{ color: T.text, fontWeight: 600 }}>{Math.max(0, Math.round(effectiveGoals.kcal - totals.kcal)).toLocaleString('cs')} kcal</span>
                            </div>
                          </>
                        );
                      })()}
                    <div style={{ display: 'flex', gap: 28, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}` }}>
                      <KV k="Přijato" v={Math.round(totals.kcal).toLocaleString('cs')} sub="kcal" vSize={24} mono={false} />
                      <KV k="Výdej" v={(burnedToday > 0 ? burnedToday : Math.round(effectiveGoals.kcal + deficitKcal)).toLocaleString('cs')} sub="kcal" vSize={24} mono={false} vColor={BRAND.orange} />
                      <KV k="Cíl příjmu" v={Math.round(effectiveGoals.kcal).toLocaleString('cs')} sub={`${pctGoal}%`} vSize={24} mono={false} />
                      {goalOverride && (
                        <button onClick={() => setGoalOverride(null)} title="Obnovit výchozí cíle"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: BRAND.orange, fontSize: 13, marginLeft: 'auto', alignSelf: 'center' }}>↺ reset</button>
                      )}
                    </div>
                  </div>

                  {/* Macros SegRing */}
                  <div style={{
                    background: T.card, border: `1px solid ${T.border}`,
                    borderRadius: 14, padding: 24,
                    display: 'flex', alignItems: 'center', gap: 20,
                  }}>
                    <SegRing size={150} stroke={14}
                      segments={[
                        { value: totals.carbs,   color: MACRO.carb },
                        { value: totals.fat,     color: MACRO.fat  },
                        { value: totals.protein, color: MACRO.pro  },
                      ]}
                    >
                      <span style={{ fontSize: 10, letterSpacing: '0.14em', color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>MAKRA</span>
                      <span style={{ fontFamily: "'Space Grotesk', Inter, sans-serif", fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {pctGoal}%
                      </span>
                    </SegRing>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <MacroLine label="Sacharidy" value={totals.carbs}   total={effectiveGoals.carbs}   color={MACRO.carb} />
                      <MacroLine label="Tuky"      value={totals.fat}     total={effectiveGoals.fat}     color={MACRO.fat}  />
                      <MacroLine label="Bílkoviny" value={totals.protein} total={effectiveGoals.protein} color={MACRO.pro}  />
                    </div>
                  </div>
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
                        <span style={{ fontSize: 10, color: T.muted, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
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

                {performanceMetricsSection}

                {historySection}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Fázový indikátor v pravém sloupci */}
                {phaseInfo && (
                  <PhaseIndicator
                    phaseInfo={phaseInfo}
                    raceName={nextRace?.name}
                  />
                )}
                {liveModeSection}
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
            {/* ── GREETING ────────────────────────────────────── */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {isViewingToday ? 'Ahoj, Alexandr' : dayNameCz.charAt(0) + dayNameCz.slice(1).toLowerCase()}
                </div>
                {isViewingToday && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 18 }}>🔥</span>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>{streak}</span>
                    <span style={{ fontSize: 9, color: T.muted, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.12em' }}>STREAK</span>
                  </div>
                )}
              </div>
              {/* Date navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '6px 8px' }}>
                <button
                  onClick={() => shiftDay(-1)}
                  style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', color: T.muted, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >‹</button>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: T.text }}>
                    {dayNameCz.charAt(0) + dayNameCz.slice(1).toLowerCase()} · {dateLabelCz}
                  </span>
                  {isViewingToday && (
                    <span style={{ marginLeft: 8, fontSize: 9, fontFamily: 'JetBrains Mono, monospace', background: BRAND.purple + '22', color: BRAND.purple, padding: '2px 6px', borderRadius: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
                      DNES
                    </span>
                  )}
                </div>
                <button
                  onClick={() => shiftDay(1)}
                  style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', color: T.muted, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >›</button>
              </div>
            </div>

            {/* Fázový indikátor — kompaktní badge */}
            {phaseInfo && (
              <div style={{ marginBottom: 12 }}>
                <PhaseIndicator
                  phaseInfo={phaseInfo}
                  raceName={nextRace?.name}
                />
              </div>
            )}

            {trainingBanner}
            {liveModeSection}
            <StretchingChecklist userId={userId} today={today} accent={accent} />

            {/* ── HERO: Workout card — skryto ───────────────── */}
            {false && (
            <div style={{
              background: `linear-gradient(135deg, #161622 0%, #11111A 100%)`,
              border: '1px solid rgba(180,200,255,0.18)',
              borderRadius: 24, padding: 18, position: 'relative', overflow: 'hidden',
              marginBottom: 14,
            }}>
              {/* orbit decoration */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }} viewBox="0 0 400 200">
                <circle cx="360" cy="100" r="150" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                <circle cx="360" cy="100" r="110" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                <circle cx="360" cy="100" r="70"  fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, position: 'relative' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: BRAND.purple, marginBottom: 5, fontFamily: 'JetBrains Mono, monospace' }}>
                    ● DNES · {training.label.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, lineHeight: 1.15, marginBottom: training.id !== 'rest' ? 4 : 0 }}>
                    {todayWorkout?.title ?? training.label}
                  </div>
                  {(trainingDay?.ride_hours ?? 0) > 0 && (
                    <div style={{ fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                      {(trainingDay!.ride_hours!).toFixed(1)} h · {Math.round(effectiveGoals.carbs)} g sach.
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigate('/plan')}
                  style={{
                    border: 'none', borderRadius: 999, padding: '9px 14px',
                    background: BRAND.purple, color: '#fff', flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 10,
                    textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginLeft: 12,
                  }}
                >
                  ▶ PLÁN
                </button>
              </div>
              {training.id !== 'rest' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, paddingTop: 12, borderTop: '1px solid rgba(180,200,255,0.08)', position: 'relative' }}>
                  {[
                    { label: 'CÍL KCAL', val: Math.round(effectiveGoals.kcal).toString() },
                    { label: 'SACH',     val: `${Math.round(effectiveGoals.carbs)}g` },
                    { label: 'VODA',     val: `${goals.water.toFixed(1)}L` },
                    { label: 'HODINY',   val: (trainingDay?.ride_hours ?? 0) > 0 ? `${(trainingDay!.ride_hours!).toFixed(1)}h` : '—' },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
                      <div style={{ fontSize: 8, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* ── FUELING RINGS 3×2 ─────────────────────────── */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: T.muted, fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>NUTRIČNÍ STAV</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'KCAL', val: totals.kcal,   max: effectiveGoals.kcal,   color: BRAND.purple, disp: `${Math.round(totals.kcal)}`, maxDisp: `${Math.round(effectiveGoals.kcal)}` },
                  { label: 'SACH', val: totals.carbs,  max: effectiveGoals.carbs,  color: BRAND.blue,   disp: `${Math.round(totals.carbs)}`, maxDisp: `${Math.round(effectiveGoals.carbs)}g` },
                  { label: 'BÍLK', val: totals.protein,max: effectiveGoals.protein,color: BRAND.green,  disp: `${Math.round(totals.protein)}`, maxDisp: `${Math.round(effectiveGoals.protein)}g` },
                  { label: 'TUKY', val: totals.fat,    max: effectiveGoals.fat,    color: BRAND.gold,   disp: `${Math.round(totals.fat)}`, maxDisp: `${Math.round(effectiveGoals.fat)}g` },
                  { label: 'VODA', val: (trainingDay?.water_glasses ?? 0) * 0.25, max: goals.water, color: BRAND.blue, disp: `${((trainingDay?.water_glasses ?? 0) * 0.25).toFixed(1)}`, maxDisp: `${goals.water.toFixed(1)}L` },
                  { label: 'SUPPL.', val: suppTaken,  max: totalSupplements,  color: BRAND.orange,  disp: `${suppTaken}`, maxDisp: `${totalSupplements}` },
                ].map(r => (
                  <div key={r.label} style={{
                    background: T.card, border: `1px solid ${T.border}`,
                    borderRadius: 14, padding: '10px 10px 8px',
                    display: 'flex', flexDirection: 'column' as const, gap: 5,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 9, color: T.muted, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>{r.label}</span>
                      <Ring size={28} stroke={3} value={r.val} max={r.max} color={r.color} />
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {r.disp}
                      <span style={{ fontSize: 9, color: T.muted, marginLeft: 2 }}>/{r.maxDisp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── WEEKLY ENERGY OVERVIEW ───────────────────── */}
            {historyData.length > 0 && (() => {
              const last7        = historyData.slice(-7);
              // Only days where we have burn data — prevents false surplus from unmatched days
              const daysWithBurn = last7.filter(d => d.burned > 0);
              const hasBurn      = daysWithBurn.length > 0;
              const weekIn       = last7.reduce((s, d) => s + d.kcal, 0);
              const weekOut      = daysWithBurn.reduce((s, d) => s + d.burned, 0);
              // Balance only over matched days (both kcal + burn known)
              const weekBalIn    = daysWithBurn.reduce((s, d) => s + d.kcal, 0);
              const weekBalance  = hasBurn ? weekBalIn - weekOut : null;

              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: T.muted, fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>
                    ENERGIE · 7 DNÍ
                  </div>
                  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 14px 12px' }}>
                    {/* Summary chips */}
                    <div style={{ display: 'grid', gridTemplateColumns: weekBalance !== null ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
                      {[
                        { label: 'PŘIJATO', val: weekIn > 0 ? `${Math.round(weekIn / 1000).toFixed(1).replace('.', ',')} k` : '—', color: accent },
                        ...(weekOut > 0 ? [{ label: 'VÝDEJ', val: `${Math.round(weekOut / 1000).toFixed(1).replace('.', ',')} k`, color: BRAND.orange }] : []),
                        ...(weekBalance !== null ? [{ label: 'BILANCE', val: `${weekBalance > 0 ? '+' : ''}${Math.round(weekBalance / 1000 * 10) / 10}k`.replace('.', ','), color: weekBalance <= 0 ? BRAND.green : '#ef4444' }] : []),
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const, color: s.color, lineHeight: 1 }}>
                            {s.val}
                          </div>
                          <div style={{ fontSize: 8, color: T.muted, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', marginTop: 3 }}>
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Per-day rows */}
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 7 }}>
                      {last7.map(d => {
                        const isToday  = d.date === today;
                        const barIn    = d.goal > 0 ? Math.min(100, (d.kcal   / d.goal) * 100) : 0;
                        const barOut   = d.goal > 0 ? Math.min(100, (d.burned / d.goal) * 100) : 0;
                        const balance  = d.burned > 0 ? d.kcal - d.burned : null;
                        const isEmpty  = d.kcal === 0 && !isToday;
                        return (
                          <div key={d.date} style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 8, alignItems: 'center', opacity: isEmpty ? 0.35 : 1 }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: isToday ? accent : T.muted, fontWeight: isToday ? 700 : 400, textTransform: 'uppercase' as const }}>
                              {d.label}
                            </span>
                            <div style={{ position: 'relative', height: 5, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
                              {/* burned bar (background) */}
                              {d.burned > 0 && (
                                <div style={{ position: 'absolute', inset: 0, width: `${barOut}%`, background: BRAND.orange + '44', borderRadius: 3 }} />
                              )}
                              {/* consumed bar (foreground) */}
                              <div style={{ position: 'absolute', inset: 0, width: `${barIn}%`, background: barIn >= 95 ? BRAND.green : isToday ? accent : accent + 'bb', borderRadius: 3 }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'flex-end', minWidth: 80 }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const, color: isToday ? T.text : T.muted }}>
                                {d.kcal > 0 ? d.kcal.toLocaleString('cs') : '—'}
                              </span>
                              {balance !== null && d.kcal > 0 && (
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: balance <= 0 ? BRAND.green : '#ef4444', fontVariantNumeric: 'tabular-nums' as const }}>
                                  {balance > 0 ? `+${balance.toLocaleString('cs')}` : balance.toLocaleString('cs')}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Legend */}
                    {hasBurn && (
                      <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                          <div style={{ width: 12, height: 4, borderRadius: 2, background: accent }} />příjem
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                          <div style={{ width: 12, height: 4, borderRadius: 2, background: BRAND.orange + '66' }} />výdej
                        </div>
                        <div style={{ marginLeft: 'auto', fontSize: 9, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                          bilance = příjem − výdej
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── AI NUDGE ──────────────────────────────────── */}
            <div
              onClick={() => navigate('/chat')}
              style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 20, padding: 14, cursor: 'pointer',
                display: 'flex', gap: 12, alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                background: BRAND.purple, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>✦</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: T.muted, fontFamily: 'JetBrains Mono, monospace', marginBottom: 3 }}>
                  AI COACH · UPOZORNĚNÍ
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 3, lineHeight: 1.3 }}>
                  {pctGoal >= 85
                    ? 'Výborný den! Splňuješ cíle výživy.'
                    : totals.protein < effectiveGoals.protein * 0.5 && primary !== 'rest'
                      ? 'Sacharidy během tréninku jsou nedostatečné'
                      : totals.kcal < effectiveGoals.kcal * 0.4
                        ? 'Energetická rezerva stále otevřená — doplň ji.'
                        : `Zbývá ${Math.max(0, Math.round(effectiveGoals.kcal - totals.kcal))} kcal a ${Math.max(0, Math.round(effectiveGoals.protein - totals.protein))} g proteinu.`
                  }
                </div>
                <div style={{ fontSize: 12, color: T.muted }}>
                  {totals.protein < effectiveGoals.protein * 0.5 && primary !== 'rest'
                    ? 'Doplň 30g bonk-prevenci. Tap pro plán.'
                    : 'Tap pro personalizovaný plán →'
                  }
                </div>
              </div>
              <span style={{ color: T.muted, fontSize: 18, flexShrink: 0, lineHeight: 1 }}>›</span>
            </div>



            {/* ── MEAL TIMELINE ─────────────────────────────── */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>DNEŠNÍ TIMELINE</div>
                <button onClick={() => navigate('/foods')} style={{ background: 'transparent', border: 'none', color: BRAND.purple, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>VŠE →</button>
              </div>
              {entries.length === 0 ? emptyStateSection : (() => {
                const SLOT_ORDER = ['snidane','svacina_1','obed','pred_tren','behem_tren','po_tren','vecere'];
                const SLOT_LABELS: Record<string, string> = {
                  snidane: 'Snídaně', svacina_1: 'Svačina', obed: 'Oběd',
                  pred_tren: 'Před tréninkem', behem_tren: 'Během tréninku',
                  po_tren: 'Po tréninku', vecere: 'Večeře',
                };
                const SLOT_TIMES: Record<string, string> = {
                  snidane: '07:30', svacina_1: '10:00', obed: '12:30',
                  pred_tren: '16:30', behem_tren: '17:00', po_tren: '19:00', vecere: '20:30',
                };
                const nowHHMM = (() => {
                  const n = new Date();
                  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
                })();
                const grouped = entries.reduce((acc, e) => {
                  if (!acc[e.meal_slot]) acc[e.meal_slot] = 0;
                  acc[e.meal_slot] += e.kcal;
                  return acc;
                }, {} as Record<string, number>);

                // Find current slot: first slot without entries whose time >= now
                const currentSlot = SLOT_ORDER.find(s =>
                  grouped[s] == null && (SLOT_TIMES[s] ?? '99:99') >= nowHHMM
                );

                return (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                    {SLOT_ORDER.filter(s => grouped[s] != null || s === currentSlot).map(slot => {
                      const hasMeal = grouped[slot] != null;
                      const isCurrent = slot === currentSlot;
                      const dotColor = hasMeal ? BRAND.green : isCurrent ? BRAND.purple : T.muted;
                      return (
                        <div key={slot} onClick={() => navigate('/foods')} style={{
                          display: 'flex', gap: 10, alignItems: 'center',
                          padding: '11px 14px', cursor: 'pointer',
                          background: isCurrent ? BRAND.purple + '0a' : 'transparent',
                          border: `1px solid ${isCurrent ? BRAND.purple + '55' : T.border}`,
                          borderRadius: 12,
                        }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: T.muted, minWidth: 36, fontVariantNumeric: 'tabular-nums' }}>
                            {SLOT_TIMES[slot] ?? ''}
                          </span>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            background: dotColor,
                            boxShadow: hasMeal ? `0 0 6px ${dotColor}88` : isCurrent ? `0 0 6px ${dotColor}88` : 'none',
                          }} />
                          <span style={{ flex: 1, fontSize: 14, fontWeight: isCurrent ? 600 : 500, color: T.text }}>
                            {SLOT_LABELS[slot] ?? slot}
                          </span>
                          {hasMeal && (
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>
                              {Math.round(grouped[slot])} kcal
                            </span>
                          )}
                          {isCurrent && !hasMeal && (
                            <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: BRAND.purple, background: BRAND.purple + '18', padding: '2px 7px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.08em' }}>
                              NYNÍ
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {hydrationSection}

          </>
        )}

      </div>
    </div>
  );
}
