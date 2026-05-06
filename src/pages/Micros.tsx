import { useContext } from 'react';
import { AppContext }       from '../App';
import { T, BRAND, Card, SectionTitle, ProgressBar } from '../components/UI';
import { MICRO_META, TRAINING_TYPES }           from '../constants/training';

function MicroRow({
  label, unit, color, consumed, goal, decimals = 0, isLast = false,
}: {
  label: string; unit: string; color: string;
  consumed: number; goal: number; decimals?: number; isLast?: boolean;
}) {
  const pct    = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
  const isOver = consumed > goal && goal > 0;
  const fmt    = (n: number) => decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();

  const statusColor = pct >= 100 ? BRAND.green : pct >= 70 ? BRAND.gold : T.muted;
  const statusText  = pct >= 100 ? '✓ Splněno' : `${pct.toFixed(0)} %`;

  return (
    <div style={{
      paddingBottom: isLast ? 0 : 14,
      marginBottom:  isLast ? 0 : 14,
      borderBottom:  isLast ? 'none' : `1px solid ${T.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: color, boxShadow: `0 0 6px ${color}88`, flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: isOver ? BRAND.red : T.text,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmt(consumed)}
          </span>
          <span style={{ fontSize: 11, color: T.muted }}>/ {fmt(goal)} {unit}</span>
          <span style={{
            fontSize: 10, color: statusColor, fontWeight: 600,
            background: statusColor + '15', borderRadius: 5, padding: '1px 6px',
          }}>
            {statusText}
          </span>
        </div>
      </div>
      <ProgressBar value={consumed} max={goal} color={color} height={5} />
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

  const scoreColor = avgScore >= 80 ? BRAND.green : avgScore >= 50 ? BRAND.gold : BRAND.red;

  const microGroups = [
    { title: 'Elektrolyty', keys: ['na', 'k', 'mg', 'ca'] },
    { title: 'Minerály',    keys: ['fe', 'zn'] },
    { title: 'Vitamíny & Omega', keys: ['vit_c', 'vit_d', 'b12', 'omega3'] },
  ];

  return (
    <div style={{ padding: '16px 16px 0', position: 'relative' }}>

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 300,
        background: 'radial-gradient(ellipse at top, rgba(0,229,176,0.06), transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Hero score card */}
        <div className="stagger-1" style={{
          background: 'linear-gradient(180deg, #11111A, #0E0E14)',
          border: `1px solid rgba(180,200,255,0.08)`,
          borderRadius: 22, padding: '20px 20px 18px',
          marginBottom: 16, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
            background: 'radial-gradient(circle at center, rgba(0,229,176,0.03) 0%, transparent 40%)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 9, color: T.muted, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
                Mikronutrienty
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{
                  fontSize: 44, fontWeight: 800, letterSpacing: '-2px', lineHeight: 1,
                  color: scoreColor, fontVariantNumeric: 'tabular-nums',
                }}>
                  {avgScore.toFixed(0)}
                </span>
                <span style={{ fontSize: 18, color: T.muted, fontWeight: 400 }}>%</span>
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>průměrné pokrytí</div>
            </div>
            <div style={{
              background: accent + '18', border: `1px solid ${accent}33`,
              borderRadius: 12, padding: '10px 14px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{training.icon}</div>
              <div style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{training.label}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>×{training.microMul}</div>
            </div>
          </div>
          <ProgressBar value={avgScore} max={100} color={scoreColor} height={5} />
        </div>

        {/* Info tip */}
        <div className="stagger-2" style={{
          background: BRAND.green + '0d', border: `1px solid ${BRAND.green}22`,
          borderRadius: 14, padding: '12px 14px', marginBottom: 16,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>💡</span>
          <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
            Při <span style={{ color: accent, fontWeight: 600 }}>{training.label.toLowerCase()}</span> stoupají nároky
            na mikronutrienty (multiplikátor ×{training.microMul}). Deficit elektrolytů a vitamínů
            snižuje výkon a zpomaluje regeneraci.
          </div>
        </div>

        {/* Micro groups */}
        {microGroups.map((group, gi) => {
          const items = MICRO_META.filter(m => group.keys.includes(m.key));
          return (
            <div key={group.title} className={`stagger-${gi + 3}`}>
              <SectionTitle accent={BRAND.green}>{group.title}</SectionTitle>
              <Card style={{ marginBottom: 16 }}>
                {items.map((m, i) => {
                  const val  = totals[m.key as keyof typeof totals] as number;
                  const goal = goals.micros[m.key] ?? m.base;
                  return (
                    <MicroRow
                      key={m.key}
                      label={m.label} unit={m.unit} color={m.color}
                      consumed={val} goal={goal}
                      decimals={m.unit === 'µg' ? 1 : 0}
                      isLast={i === items.length - 1}
                    />
                  );
                })}
              </Card>
            </div>
          );
        })}

        {/* Goals reference chips */}
        <SectionTitle accent={BRAND.gold}>Denní cíle dle tréninku</SectionTitle>
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {MICRO_META.map(m => {
              const goal = goals.micros[m.key] ?? m.base;
              const val  = totals[m.key as keyof typeof totals] as number;
              const pct  = goal > 0 ? Math.min(100, (val / goal) * 100) : 0;
              return (
                <div key={m.key} style={{
                  background: m.color + '12',
                  border: `1px solid ${pct >= 100 ? m.color + '55' : m.color + '25'}`,
                  borderRadius: 9,
                  padding: '6px 10px',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ fontSize: 10, color: T.muted, marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: m.color, fontVariantNumeric: 'tabular-nums' }}>
                    {m.unit === 'µg' ? goal.toFixed(1) : Math.round(goal)} {m.unit}
                  </div>
                  {pct >= 100 && (
                    <div style={{
                      position: 'absolute', top: 4, right: 6,
                      fontSize: 9, color: BRAND.green, fontWeight: 700,
                    }}>✓</div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

      </div>
    </div>
  );
}
