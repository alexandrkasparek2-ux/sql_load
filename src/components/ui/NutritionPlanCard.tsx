interface Props {
  trainingTitle: string;
  duration: string;
  tss?: number;
  preTraining: { carbs: number; protein?: number };
  duringTraining: { carbsRange: string };
  postTraining: { carbs: number; protein: number };
  hydration: { rate: number; sodium: number };
}

export function NutritionPlanCard({ trainingTitle, duration, tss, preTraining, duringTraining, postTraining, hydration }: Props) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)', borderRadius: 18, padding: 18 }}>
      <div className="label-caps" style={{ color: 'var(--brand-primary)', marginBottom: 8 }}>Nutriční plán</div>
      <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{trainingTitle}</div>
      <div style={{ color: 'var(--text-tertiary)', fontSize: 12, marginBottom: 14 }}>
        {duration}{tss != null ? ` · TSS ${Math.round(tss)}` : ''}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <PlanRow label="Před tréninkem" value={`${Math.round(preTraining.carbs)} g S`} sub={preTraining.protein ? `${Math.round(preTraining.protein)} g B` : undefined} color="var(--macro-carbs)" />
        <PlanRow label="Během" value={duringTraining.carbsRange} color="var(--brand-primary)" />
        <PlanRow label="Po tréninku" value={`${Math.round(postTraining.protein)} g B`} sub={`${Math.round(postTraining.carbs)} g S`} color="var(--macro-protein)" />
        <PlanRow label="Hydratace" value={`${Math.round(hydration.rate)} ml/h`} sub={`${Math.round(hydration.sodium)} mg sodíku/h`} color="var(--hydration)" />
      </div>
    </div>
  );
}

function PlanRow({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, background: 'var(--bg-secondary)', borderRadius: 10, padding: '11px 12px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1.3, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color, fontSize: 14, fontWeight: 800 }}>{value}</div>
        {sub && <div style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default NutritionPlanCard;
