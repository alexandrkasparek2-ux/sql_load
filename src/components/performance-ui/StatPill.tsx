interface Props {
  value: string | number;
  label: string;
  variant?: 'kcal' | 'time' | 'distance' | 'tss' | 'hr' | 'power';
}

const variantColor: Record<NonNullable<Props['variant']>, string> = {
  kcal: 'var(--brand-primary)',
  time: 'var(--text-primary)',
  distance: 'var(--analytics-blue)',
  tss: 'var(--tss)',
  hr: 'var(--heart-rate)',
  power: 'var(--brand-primary)',
};

export function StatPill({ value, label, variant = 'kcal' }: Props) {
  const color = variantColor[variant];
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 10px', minWidth: 78 }}>
      <div style={{ color, fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default StatPill;
