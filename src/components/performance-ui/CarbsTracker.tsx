interface Props {
  recommended: { min: number; max: number; unit: string };
  actual: number;
  totalIntake: number;
  duration?: string;
}

export function CarbsTracker({ recommended, actual, totalIntake, duration }: Props) {
  const inRange = actual >= recommended.min && actual <= recommended.max;
  const actualColor = inRange || recommended.min === 0 ? 'var(--status-success)' : 'var(--brand-accent)';

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 18 }}>
      <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Carbs / h během tréninku</div>
      <div style={{ color: 'var(--text-tertiary)', fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>
        Sleduj, jestli skutečný intake během výkonu odpovídá doporučenému rozsahu.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 14 }}>
          <div className="label-caps" style={{ marginBottom: 6 }}>Doporučení</div>
          <div style={{ color: 'var(--brand-primary)', fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
            {recommended.min}-{recommended.max}<span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 400 }}> {recommended.unit}</span>
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 14 }}>
          <div className="label-caps" style={{ marginBottom: 6 }}>Realita</div>
          <div style={{ color: actualColor, fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
            {actual.toFixed(1)}<span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 400 }}> {recommended.unit}</span>
          </div>
        </div>
      </div>
      <div style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
        Zapsáno během výkonu: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(totalIntake)} g</strong>{duration ? ` · ${duration}` : ''}.
      </div>
    </div>
  );
}

export default CarbsTracker;
