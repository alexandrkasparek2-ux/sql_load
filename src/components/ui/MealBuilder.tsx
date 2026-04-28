export interface MealSuggestion {
  name: string;
  weight: string;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  match: 'perfect' | 'good' | 'partial';
}

interface Props {
  remaining: { kcal: number; carbs: number; protein: number; fat: number };
  suggestions: MealSuggestion[];
}

const matchColor: Record<MealSuggestion['match'], string> = {
  perfect: 'var(--status-success)',
  good: 'var(--brand-primary)',
  partial: 'var(--analytics-blue)',
};

export function MealBuilder({ remaining, suggestions }: Props) {
  const metrics: Array<{ label: string; value: string | number; color: string }> = [
    { label: 'Zbývá kcal', value: Math.round(remaining.kcal), color: 'var(--brand-primary)' },
    { label: 'Sacharidy', value: `${Math.round(remaining.carbs)} g`, color: 'var(--macro-carbs)' },
    { label: 'Bílkoviny', value: `${Math.round(remaining.protein)} g`, color: 'var(--macro-protein)' },
    { label: 'Tuky', value: `${Math.round(remaining.fat)} g`, color: 'var(--macro-fat)' },
  ];

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 18 }}>
      <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Meal Builder podle zbylých maker</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, margin: '14px 0' }}>
        {metrics.map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 12 }}>
            <div className="label-caps" style={{ marginBottom: 4 }}>{label}</div>
            <div style={{ color, fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suggestions.map(item => (
          <div key={`${item.name}-${item.weight}`} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 800 }}>{item.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{item.weight} · {Math.round(item.kcal)} kcal</div>
              </div>
              <div style={{ color: matchColor[item.match], fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{item.match}</div>
            </div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
              <span style={{ color: 'var(--macro-carbs)' }}>{Math.round(item.carbs)} g S</span> · <span style={{ color: 'var(--macro-protein)' }}>{Math.round(item.protein)} g B</span> · <span style={{ color: 'var(--macro-fat)' }}>{Math.round(item.fat)} g T</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MealBuilder;
