import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext }  from '../App';
import { T, MacroCard, ProgressBar, SectionTitle, Card, Btn } from '../components/UI';
import { MICRO_META, TRAINING_TYPES, MEAL_RECS, primaryType } from '../constants/training';
import { FOODS } from '../constants/foods';
import { useWeeklyData, type DayKcal } from '../hooks/useWeeklyData';

// ─── Calorie ring ────────────────────────────────────────────
function KcalRing({ consumed, goal, accent }: { consumed: number; goal: number; accent: string }) {
  const pct    = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const r      = 70;
  const circ   = 2 * Math.PI * r;
  const dash   = pct * circ;
  const isOver = consumed > goal && goal > 0;
  const fill   = isOver ? '#ef4444' : accent;

  return (
    <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0 }}>
      <svg width={180} height={180} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={90} cy={90} r={r} fill="none" stroke={T.border} strokeWidth={12} />
        <circle
          cx={90} cy={90} r={r}
          fill="none"
          stroke={fill}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${fill}88)` }}
        />
      </svg>
      <div style={{
        position:       'absolute',
        inset:          0,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 30, fontWeight: 800, color: T.text, lineHeight: 1 }}>
          {Math.round(consumed)}
        </span>
        <span style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>z {Math.round(goal)} kcal</span>
        <span style={{ fontSize: 11, color: isOver ? '#ef4444' : accent, marginTop: 2, fontWeight: 600 }}>
          {isOver ? `+${Math.round(consumed - goal)} přes` : `${Math.round(goal - consumed)} zbývá`}
        </span>
      </div>
    </div>
  );
}

// ─── 14-day history chart ─────────────────────────────────────
function HistoryChart({ data, accent, kcalGoal }: { data: DayKcal[]; accent: string; kcalGoal: number }) {
  const today  = new Date().toISOString().split('T')[0];
  const maxVal = Math.max(...data.map(d => d.kcal), kcalGoal, 1);
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
          const x        = i * (barW + gap);
          const barH     = maxVal > 0 ? (d.kcal / maxVal) * H : 0;
          const y        = H - barH;
          const isToday  = d.date === today;
          const goalY    = kcalGoal > 0 ? H - (kcalGoal / maxVal) * H : -1;
          const overGoal = d.kcal > 0 && kcalGoal > 0 && d.kcal > kcalGoal * 1.1;
          const barColor = isToday ? accent
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
              {/* Goal line */}
              {kcalGoal > 0 && goalY >= 0 && (
                <line
                  x1={x} y1={goalY} x2={x + barW} y2={goalY}
                  stroke={accent + 'aa'} strokeWidth={1.5} strokeDasharray="3,2"
                />
              )}
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
          { label: 'Kcal', value: Math.round(totals.kcal),    color: accent  },
          { label: 'S',    value: Math.round(totals.carbs),   color: '#f59e0b' },
          { label: 'B',    value: Math.round(totals.protein), color: '#22c55e' },
          { label: 'T',    value: Math.round(totals.fat),     color: '#a855f7' },
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

  const {
    accent, totals, goals, trainingDay, upsertTrainingDay,
    entries, userId, today, addEntry,
  } = ctx;

  const { data: historyData } = useWeeklyData(userId, 14);

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

  return (
    <div style={{ padding: '16px 16px 0' }}>

      {/* Training type badge */}
      <div style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          6,
        background:   accent + '1a',
        border:       `1px solid ${accent}44`,
        borderRadius: 20,
        padding:      '4px 12px',
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 14 }}>{training.icon}</span>
        <span style={{ fontSize: 13, color: accent, fontWeight: 600 }}>{training.label}</span>
      </div>

      {/* Calories + ring */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <KcalRing consumed={totals.kcal} goal={goals.kcal} accent={accent} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Kalorický příjem
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <MiniStat label="Snědeno" value={`${Math.round(totals.kcal)} kcal`} color={accent} />
              <MiniStat label="Cíl"     value={`${Math.round(goals.kcal)} kcal`}  color={T.muted} />
              <MiniStat
                label="Zbývá"
                value={`${Math.max(0, Math.round(goals.kcal - totals.kcal))} kcal`}
                color={totals.kcal > goals.kcal ? '#ef4444' : T.text}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Macro cards */}
      <SectionTitle accent={accent}>Makroživiny</SectionTitle>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <MacroCard label="Sacharidy" value={totals.carbs}   target={goals.carbs}   unit="g" color="#f59e0b" />
        <MacroCard label="Bílkoviny" value={totals.protein} target={goals.protein} unit="g" color="#22c55e" />
        <MacroCard label="Tuky"      value={totals.fat}     target={goals.fat}     unit="g" color="#a855f7" />
      </div>

      {/* Fiber bar */}
      {(() => {
        const fiberVal  = Math.round(totals.fiber * 10) / 10;
        const fiberGoal = goals.fiber;
        const pct       = Math.min(1, fiberVal / fiberGoal);
        const done      = fiberVal >= fiberGoal;
        return (
          <div style={{
            background:   T.card,
            border:       `1px solid ${T.border}`,
            borderRadius: 12,
            padding:      '10px 14px',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: T.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                🌾 Vláknina
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: done ? '#22c55e' : T.text }}>
                {fiberVal} <span style={{ fontWeight: 400, color: T.muted, fontSize: 11 }}>/ {fiberGoal} g</span>
                {done && <span style={{ marginLeft: 6, fontSize: 11, color: '#22c55e' }}>✓</span>}
              </span>
            </div>
            <ProgressBar value={fiberVal} max={fiberGoal} color="#84cc16" height={5} />
            <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>
              Doporučení: {fiberGoal} g / den · {Math.round(pct * 100)} % splněno
            </div>
          </div>
        );
      })()}

      {/* 14-day history chart */}
      <SectionTitle accent={accent}>
        Historie kalorií <span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>— 14 dní</span>
      </SectionTitle>
      <Card style={{ marginBottom: 4, padding: '14px 12px 10px' }}>
        {historyData.length > 0 ? (
          <HistoryChart data={historyData} accent={accent} kcalGoal={goals.kcal} />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: T.muted, fontSize: 13 }}>
            Načítám data…
          </div>
        )}
      </Card>
      {/* Stats row */}
      {daysWithData.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Průměr / den', value: `${avgKcal} kcal`, color: accent },
            { label: 'Aktivní dny',  value: `${daysWithData.length} / 14`,  color: T.muted },
            { label: 'Cíl dnes',     value: `${Math.round(goals.kcal)} kcal`, color: T.muted },
          ].map(s => (
            <div key={s.label} style={{
              flex:         1,
              background:   T.card,
              border:       `1px solid ${T.border}`,
              borderRadius: 10,
              padding:      '8px 10px',
              textAlign:    'center',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {!daysWithData.length && <div style={{ marginBottom: 16 }} />}

      {/* Training meal recommendation */}
      {primary !== 'rest' && (
        <>
          <SectionTitle accent={accent}>Co si vzít s sebou?</SectionTitle>
          <MealRecCard
            trainingType={primary}
            accent={accent}
            onAddAll={handleAddMealRec}
          />
        </>
      )}

      {/* Water + Caffeine trackers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        <WaterTracker
          glasses={trainingDay?.water_glasses ?? 0}
          goalLitres={goals.water}
          accent={accent}
          onAdd={handleWaterAdd}
          onRemove={handleWaterRemove}
        />
        <CaffeineTracker
          cups={trainingDay?.coffee_cups ?? 0}
          onAdd={handleCoffeeAdd}
          onRemove={handleCoffeeRemove}
        />
      </div>

      {/* Micros preview */}
      <SectionTitle
        accent={accent}
        right={
          <button
            onClick={() => navigate('/micros')}
            style={{ background: 'none', border: 'none', color: accent, fontSize: 13, cursor: 'pointer' }}
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
                  <span style={{ marginLeft: 6, color: pct >= 100 ? '#22c55e' : T.muted }}>
                    {pct.toFixed(0)}%
                  </span>
                </span>
              </div>
              <ProgressBar value={val} max={goal} color={m.color} height={4} />
            </div>
          );
        })}
      </Card>

      {/* CTA if no entries */}
      {noEntries && (
        <Card style={{ textAlign: 'center', padding: 24, marginBottom: 16, borderColor: accent + '44' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🍽️</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>
            Zatím žádná jídla
          </div>
          <div style={{ fontSize: 14, color: T.muted, marginBottom: 16 }}>
            Začni sledovat svůj nutriční příjem a plň denní cíle.
          </div>
          <Btn accent={accent} size="lg" full onClick={() => navigate('/foods')}>
            + Přidat první jídlo
          </Btn>
        </Card>
      )}

      {/* Training tips */}
      <SectionTitle accent={accent}>Tipy pro dnešek</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        {training.tips.map((tip, i) => (
          <div key={i} style={{
            display:       'flex',
            alignItems:    'flex-start',
            gap:           10,
            paddingBottom: i < training.tips.length - 1 ? 10 : 0,
            marginBottom:  i < training.tips.length - 1 ? 10 : 0,
            borderBottom:  i < training.tips.length - 1 ? `1px solid ${T.border}` : 'none',
          }}>
            <span style={{ color: accent, fontSize: 14, marginTop: 1 }}>✓</span>
            <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{tip}</span>
          </div>
        ))}
      </Card>

    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: T.muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}
