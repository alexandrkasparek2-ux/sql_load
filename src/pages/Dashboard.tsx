import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext }  from '../App';
import { T, MacroCard, ProgressBar, SectionTitle, Card, Btn } from '../components/UI';
import { MICRO_META, TRAINING_TYPES } from '../constants/training';
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

// ─── Weekly calorie chart ─────────────────────────────────────
function WeeklyChart({ data, accent, kcalGoal }: { data: DayKcal[]; accent: string; kcalGoal: number }) {
  const today  = new Date().toISOString().split('T')[0];
  const maxVal = Math.max(...data.map(d => d.kcal), kcalGoal, 1);
  const barW   = 30;
  const gap    = 12;
  const H      = 80;
  const W      = 7 * barW + 6 * gap;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 24}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        {data.map((d, i) => {
          const x        = i * (barW + gap);
          const barH     = maxVal > 0 ? (d.kcal / maxVal) * H : 0;
          const y        = H - barH;
          const isToday  = d.date === today;
          const goalY    = kcalGoal > 0 ? H - (kcalGoal / maxVal) * H : -1;
          const barColor = isToday ? accent : accent + '55';

          return (
            <g key={d.date}>
              {/* Background track */}
              <rect x={x} y={0} width={barW} height={H} rx={4} fill={T.border} />
              {/* Filled bar */}
              {d.kcal > 0 && (
                <rect
                  x={x} y={y} width={barW} height={barH} rx={4}
                  fill={barColor}
                  style={{ filter: isToday ? `drop-shadow(0 0 4px ${accent}88)` : 'none' }}
                />
              )}
              {/* Goal dashed line */}
              {kcalGoal > 0 && goalY >= 0 && (
                <line
                  x1={x} y1={goalY} x2={x + barW} y2={goalY}
                  stroke={accent + 'aa'} strokeWidth={1.5} strokeDasharray="3,2"
                />
              )}
              {/* Day label */}
              <text
                x={x + barW / 2} y={H + 14}
                textAnchor="middle" fontSize={9}
                fill={isToday ? accent : '#6b7280'}
                fontWeight={isToday ? '700' : '400'}
              >
                {d.label}
              </text>
              {/* Value label */}
              {d.kcal > 0 && (
                <text
                  x={x + barW / 2} y={Math.max(y - 3, 9)}
                  textAnchor="middle" fontSize={8}
                  fill={isToday ? accent : '#6b7280'}
                >
                  {d.kcal >= 1000 ? `${(d.kcal / 1000).toFixed(1)}k` : String(Math.round(d.kcal))}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 10, borderRadius: 2, background: accent }} />
          <span style={{ fontSize: 10, color: T.muted }}>dnes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width={16} height={4} style={{ flexShrink: 0 }}>
            <line x1={0} y1={2} x2={16} y2={2} stroke={accent + 'aa'} strokeWidth={1.5} strokeDasharray="3,2" />
          </svg>
          <span style={{ fontSize: 10, color: T.muted }}>denní cíl</span>
        </div>
      </div>
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
const CAFFEINE_PER_CUP = 80;   // mg per espresso
const CAFFEINE_LIMIT   = 400;  // mg daily limit (5 cups)

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

// ─── Dashboard page ──────────────────────────────────────────
export default function Dashboard() {
  const ctx      = useContext(AppContext);
  const navigate = useNavigate();

  const {
    accent, totals, goals, trainingDay, upsertTrainingDay, entries, userId,
  } = ctx;

  const { data: weeklyData } = useWeeklyData(userId);

  const training = TRAINING_TYPES.find(t => t.id === (trainingDay?.training_type ?? 'rest'))!;

  const handleWaterAdd    = () => upsertTrainingDay({ water_glasses: (trainingDay?.water_glasses ?? 0) + 1 });
  const handleWaterRemove = () => upsertTrainingDay({ water_glasses: Math.max(0, (trainingDay?.water_glasses ?? 0) - 1) });

  const handleCoffeeAdd    = () => upsertTrainingDay({ coffee_cups: (trainingDay?.coffee_cups ?? 0) + 1 });
  const handleCoffeeRemove = () => upsertTrainingDay({ coffee_cups: Math.max(0, (trainingDay?.coffee_cups ?? 0) - 1) });

  const noEntries = entries.length === 0;
  const topMicros = MICRO_META.slice(0, 6);

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
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <MacroCard label="Sacharidy" value={totals.carbs}   target={goals.carbs}   unit="g" color="#f59e0b" />
        <MacroCard label="Bílkoviny" value={totals.protein} target={goals.protein} unit="g" color="#22c55e" />
        <MacroCard label="Tuky"      value={totals.fat}     target={goals.fat}     unit="g" color="#a855f7" />
      </div>

      {/* Weekly calorie chart */}
      <SectionTitle accent={accent}>Týdenní přehled</SectionTitle>
      <Card style={{ marginBottom: 16, padding: '16px 12px 12px' }}>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>
          Kalorický příjem za posledních 7 dní
        </div>
        {weeklyData.length > 0 ? (
          <WeeklyChart data={weeklyData} accent={accent} kcalGoal={goals.kcal} />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: T.muted, fontSize: 13 }}>
            Načítám data…
          </div>
        )}
      </Card>

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
