import { ProgressRing } from './ProgressRing';

interface Props {
  value: number;
  max: number;
  label?: string;
  size?: number;
}

export function IntakeRing({ value, max, label = 'KCAL PŘÍJEM', size = 240 }: Props) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <ProgressRing value={value} max={max} size={size} strokeWidth={12}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          fontSize: size * 0.22,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: 0,
          fontVariantNumeric: 'tabular-nums',
          background: 'linear-gradient(180deg, #fff, #888)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {Math.round(value)}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginTop: 6 }}>{label}</div>
        <div style={{ marginTop: 10, padding: '4px 12px', background: 'rgba(124,92,255,0.1)', borderRadius: 10, color: 'var(--brand-primary)', fontSize: 11, fontWeight: 700 }}>
          {pct}% cíle
        </div>
      </div>
    </ProgressRing>
  );
}

export default IntakeRing;
