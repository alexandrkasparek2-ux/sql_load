// ============================================================
// DailyNutritionDashboard.tsx
// Denní nutriční dashboard — velké číslo kcal cíle, progress ring,
// makro bary a dynamická zpráva o plnění cíle.
// ============================================================

import type { DailyNutritionTarget } from '../../services/nutritionTargetService';

interface Props {
  target:          DailyNutritionTarget;
  actualKcal:      number;
  actualCarbs:     number;
  actualProtein:   number;
  actualFat:       number;
}

// Kruhový progress arc (SVG)
function ProgressRingArc({
  value, max, color, size = 80, stroke = 8,
}: { value: number; max: number; color: string; size?: number; stroke?: number }) {
  const r     = (size - stroke) / 2;
  const circ  = 2 * Math.PI * r;
  const ratio = Math.min(value / Math.max(max, 1), 1.1); // max 110% vizuálně
  const dash  = ratio * circ;
  const cx    = size / 2;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 600ms ease' }}
      />
    </svg>
  );
}

// Makro progress bar
function MacroBar({
  label, actual, target, color, unit = 'g',
}: { label: string; actual: number; target: number; color: string; unit?: string }) {
  const pct = Math.min((actual / Math.max(target, 1)) * 100, 110);
  const over = pct > 100;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ color: over ? '#ef4444' : color, fontSize: 11, fontWeight: 800 }}>
          {Math.round(actual)}/{Math.round(target)}{unit}
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, minWidth: pct > 0 ? 4 : 0,
          background: over ? '#ef4444' : color,
          borderRadius: 3,
          transition: 'width 500ms ease',
        }} />
      </div>
    </div>
  );
}

// Dynamická zpráva o plnění
function ComplianceMessage({
  actual, target,
}: { actual: number; target: number }) {
  if (target === 0) return null;
  const pct  = actual / target;
  const diff = Math.abs(Math.round(target - actual));

  let bg   = 'rgba(34,197,94,0.1)';
  let text = '';
  let color = '#22c55e';

  if (pct < 0.6) {
    bg    = 'rgba(239,68,68,0.1)';
    color = '#ef4444';
    text  = `⚠️ Nedostatečný příjem! Dojezte ještě ${diff} kcal`;
  } else if (pct < 0.8) {
    bg    = 'rgba(245,158,11,0.1)';
    color = '#f59e0b';
    text  = `📊 Dobrý pokrok, ještě ${diff} kcal do cíle`;
  } else if (pct <= 1.05) {
    text  = `✅ Skvěle! Cíl téměř splněn (${Math.round(pct * 100)} %)`;
  } else if (pct > 1.10) {
    bg    = 'rgba(239,68,68,0.1)';
    color = '#ef4444';
    text  = `⚠️ Překročen cíl o ${diff} kcal`;
  } else {
    text = `✅ Cíl splněn! (${Math.round(pct * 100)} %)`;
  }

  return (
    <div style={{
      background: bg, borderRadius: 10, padding: '10px 14px',
      color, fontSize: 13, fontWeight: 700,
    }}>
      {text}
    </div>
  );
}

export function DailyNutritionDashboard({
  target, actualKcal, actualCarbs, actualProtein, actualFat,
}: Props) {
  const kcalPct = Math.min((actualKcal / Math.max(target.kcal, 1)) * 100, 110);

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)', borderRadius: 18, padding: 18 }}>
      <div className="label-caps" style={{ color: 'var(--brand-primary)', marginBottom: 14 }}>
        Denní cíl výživy
      </div>

      {/* Velký kcal ring + číslo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
        <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
          <ProgressRingArc value={actualKcal} max={target.kcal} color="var(--brand-primary)" />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 900, lineHeight: 1 }}>
              {Math.round(kcalPct)}%
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
            Cíl dne
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: 28, fontWeight: 900, lineHeight: 1, marginBottom: 2 }}>
            {target.kcal.toLocaleString('cs-CZ')}
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 4 }}>kcal</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            přijato {Math.round(actualKcal).toLocaleString('cs-CZ')} kcal
          </div>
        </div>
      </div>

      {/* Makro bary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <MacroBar label="S" actual={actualCarbs}   target={target.carbs_g}   color="var(--macro-carbs,#f59e0b)" />
        <MacroBar label="B" actual={actualProtein} target={target.protein_g} color="var(--macro-protein,#3b82f6)" />
        <MacroBar label="T" actual={actualFat}     target={target.fat_g}     color="var(--macro-fat,#ef4444)" />
      </div>

      {/* Compliance zpráva */}
      <ComplianceMessage actual={actualKcal} target={target.kcal} />

      {/* Varování */}
      {target.warnings.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {target.warnings.map((w, i) => (
            <div key={i} style={{
              background: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: '8px 12px',
              color: '#ef4444', fontSize: 12, marginTop: 6,
            }}>
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Hydratace */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
        color: 'var(--text-tertiary)', fontSize: 12,
      }}>
        <span>💧</span>
        <span>Hydratační cíl: {target.water_glasses} sklenic vody</span>
      </div>
    </div>
  );
}

export default DailyNutritionDashboard;
