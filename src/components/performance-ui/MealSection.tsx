export interface FoodItem {
  name: string;
  qty: string;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
}

interface Props {
  title: string;
  icon: string;
  time: string;
  variant: 'breakfast' | 'snack' | 'lunch' | 'pre' | 'during' | 'post' | 'dinner';
  items: FoodItem[];
  totalKcal: number;
  onAdd: () => void;
  onEdit?: (idx: number) => void;
  onDelete?: (idx: number) => void;
}

const variantBg: Record<Props['variant'], string> = {
  breakfast: 'rgba(255, 214, 0, 0.12)',
  snack: 'rgba(255, 107, 53, 0.12)',
  lunch: 'rgba(0, 229, 176, 0.12)',
  pre: 'rgba(255, 214, 0, 0.12)',
  during: 'rgba(255, 107, 53, 0.12)',
  post: 'rgba(0, 229, 176, 0.12)',
  dinner: 'rgba(79, 195, 247, 0.12)',
};

export function MealSection({ title, icon, time, variant, items, totalKcal, onAdd, onEdit, onDelete }: Props) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: variantBg[variant], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 800 }}>{title}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>{time} · {items.length} položek</div>
        </div>
        <div style={{ color: 'var(--brand-primary)', fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{Math.round(totalKcal)} kcal</div>
        <button type="button" onClick={onAdd} className="tap-scale" style={{ width: 30, height: 30, background: 'rgba(255,214,0,0.08)', border: '1px solid rgba(255,214,0,0.2)', borderRadius: 8, color: 'var(--brand-primary)', fontSize: 16, cursor: 'pointer' }}>+</button>
      </div>
      {items.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px 16px 12px' }}>
          {items.map((item, idx) => (
            <div key={`${item.name}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: idx < items.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <button type="button" onClick={() => onEdit?.(idx)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 0, padding: 0, cursor: onEdit ? 'pointer' : 'default' }}>
                <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}>{item.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{item.qty} · {Math.round(item.carbs)} g S · {Math.round(item.protein)} g B · {Math.round(item.fat)} g T</div>
              </button>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>{Math.round(item.kcal)} kcal</div>
              {onDelete && <button type="button" onClick={() => onDelete(idx)} style={{ background: 'transparent', border: 0, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MealSection;
