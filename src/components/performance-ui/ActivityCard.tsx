interface Props {
  icon: string;
  title: string;
  duration: string;
  distance?: string;
  elevation?: string;
  heartRate?: string;
  power?: string;
  tss?: number;
  kcal: number;
  variant: 'planned' | 'completed' | 'live';
}

const variantStyles = {
  planned: { border: 'var(--border-analytics)', bg: 'linear-gradient(135deg, rgba(79,195,247,0.06), var(--bg-card))' },
  completed: { border: 'var(--border-subtle)', bg: 'var(--bg-card)' },
  live: { border: 'rgba(124,92,255,0.35)', bg: 'linear-gradient(135deg, rgba(124,92,255,0.08), var(--bg-card))' },
};

export function ActivityCard({ icon, title, duration, distance, elevation, heartRate, power, tss, kcal, variant }: Props) {
  const chips = [
    { label: duration, show: true },
    { label: distance, show: !!distance },
    { label: elevation, show: !!elevation },
    { label: heartRate, show: !!heartRate },
    { label: power, show: !!power },
    { label: tss != null ? `TSS ${Math.round(tss)}` : undefined, show: tss != null },
  ];
  const style = variantStyles[variant];

  return (
    <div style={{ background: style.bg, border: `1px solid ${style.border}`, borderRadius: 14, padding: 12, display: 'flex', gap: 12 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(79,195,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 800, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {chips.filter(chip => chip.show).map(chip => (
            <span key={chip.label} style={{ color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '3px 8px', fontSize: 10 }}>
              {chip.label}
            </span>
          ))}
        </div>
      </div>
      <div style={{ color: 'var(--brand-primary)', fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {Math.round(kcal)}
        <div style={{ color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>kcal</div>
      </div>
    </div>
  );
}

export default ActivityCard;
