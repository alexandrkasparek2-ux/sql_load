import { useContext } from 'react';
import { AppContext }       from '../App';
import { T, Card, SectionTitle, ProgressBar } from '../components/UI';
import { MICRO_META, TRAINING_TYPES }           from '../constants/training';

function MicroRow({
  label, unit, color, consumed, goal, decimals = 0,
}: {
  label: string; unit: string; color: string;
  consumed: number; goal: number; decimals?: number;
}) {
  const pct    = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
  const isOver = consumed > goal && goal > 0;
  const fmt    = (n: number) => decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();

  let status: string;
  let statusColor: string;
  if (pct >= 100) {
    status = '✓ Splněno';
    statusColor = '#22c55e';
  } else if (pct >= 70) {
    status = `${pct.toFixed(0)} %`;
    statusColor = '#f59e0b';
  } else {
    status = `${pct.toFixed(0)} %`;
    statusColor = T.muted;
  }

  return (
    <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}88` }} />
          <span style={{ fontSize: 14, color: T.text, fontWeight: 500 }}>{label}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: isOver ? '#ef4444' : T.text }}>
            {fmt(consumed)}
          </span>
          <span style={{ fontSize: 12, color: T.muted }}> / {fmt(goal)} {unit}</span>
          <span style={{ fontSize: 11, color: statusColor, marginLeft: 6 }}>{status}</span>
        </div>
      </div>
      <ProgressBar value={consumed} max={goal} color={color} height={6} />
    </div>
  );
}

export default function Micros() {
  const { accent, totals, goals, trainingDay } = useContext(AppContext);

  const type     = trainingDay?.training_type ?? 'rest';
  const training = TRAINING_TYPES.find(t => t.id === type)!;

  const totalScore = MICRO_META.reduce((sum, m) => {
    const val  = totals[m.key as keyof typeof totals] as number;
    const goal = goals.micros[m.key] ?? m.base;
    return sum + (goal > 0 ? Math.min(1, val / goal) : 0);
  }, 0);
  const avgScore = (totalScore / MICRO_META.length) * 100;

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <SectionTitle accent={accent}>Mikronutrienty</SectionTitle>

      {/* Score card */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Celkové pokrytí
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: avgScore >= 80 ? '#22c55e' : avgScore >= 50 ? '#f59e0b' : accent }}>
              {avgScore.toFixed(0)} %
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>průměr 10 mikronutrientů</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>{training.icon}</span>
              <span style={{ fontSize: 13, color: accent, fontWeight: 600 }}>{training.label}</span>
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>
              Multiplikátor: ×{training.microMul}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <ProgressBar value={avgScore} max={100} color={accent} height={6} />
        </div>
      </Card>

      {/* Info card */}
      <Card style={{ marginBottom: 16, background: accent + '0d', borderColor: accent + '33' }}>
        <div style={{ fontSize: 12, color: accent, fontWeight: 600, marginBottom: 4 }}>
          💡 Proč mikronutrienty záleží
        </div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
          Při {training.label.toLowerCase()} stoupají nároky na mikronutrienty
          (multiplikátor ×{training.microMul}). Deficit elektrolytů a vitamínů
          snižuje výkon a zpomaluje regeneraci.
        </div>
      </Card>

      {/* Electrolytes group */}
      <SectionTitle accent={accent}>Elektrolyty</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        {MICRO_META.filter(m => ['na', 'k', 'mg', 'ca'].includes(m.key)).map((m, i, arr) => {
          const val  = totals[m.key as keyof typeof totals] as number;
          const goal = goals.micros[m.key] ?? m.base;
          const isLast = i === arr.length - 1;
          return (
            <div key={m.key} style={isLast ? { paddingBottom: 0, marginBottom: 0, border: 'none' } : undefined}>
              <MicroRow
                label={m.label} unit={m.unit} color={m.color}
                consumed={val} goal={goal}
                decimals={m.unit === 'µg' ? 1 : 0}
              />
            </div>
          );
        })}
      </Card>

      {/* Minerals */}
      <SectionTitle accent={accent}>Minerály</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        {MICRO_META.filter(m => ['fe', 'zn'].includes(m.key)).map((m, i, arr) => {
          const val  = totals[m.key as keyof typeof totals] as number;
          const goal = goals.micros[m.key] ?? m.base;
          const isLast = i === arr.length - 1;
          return (
            <div key={m.key} style={isLast ? { paddingBottom: 0, marginBottom: 0, border: 'none' } : undefined}>
              <MicroRow
                label={m.label} unit={m.unit} color={m.color}
                consumed={val} goal={goal}
                decimals={1}
              />
            </div>
          );
        })}
      </Card>

      {/* Vitamins */}
      <SectionTitle accent={accent}>Vitamíny & Omega</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        {MICRO_META.filter(m => ['vit_c', 'vit_d', 'b12', 'omega3'].includes(m.key)).map((m, i, arr) => {
          const val  = totals[m.key as keyof typeof totals] as number;
          const goal = goals.micros[m.key] ?? m.base;
          const isLast = i === arr.length - 1;
          return (
            <div key={m.key} style={isLast ? { paddingBottom: 0, marginBottom: 0, border: 'none' } : undefined}>
              <MicroRow
                label={m.label} unit={m.unit} color={m.color}
                consumed={val} goal={goal}
                decimals={m.unit === 'µg' ? 1 : 0}
              />
            </div>
          );
        })}
      </Card>

      {/* Micro goals reference */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Denní cíle (dle tréninku)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {MICRO_META.map(m => {
            const goal = goals.micros[m.key] ?? m.base;
            return (
              <div key={m.key} style={{
                background: m.color + '15',
                border: `1px solid ${m.color}33`,
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: 12,
              }}>
                <span style={{ color: T.muted }}>{m.label}: </span>
                <span style={{ color: m.color, fontWeight: 600 }}>
                  {m.unit === 'µg' ? goal.toFixed(1) : Math.round(goal)} {m.unit}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

    </div>
  );
}
