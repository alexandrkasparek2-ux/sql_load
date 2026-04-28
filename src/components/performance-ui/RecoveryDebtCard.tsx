interface Props {
  debt: number;
  context?: string;
  recommendation?: string;
}

export function RecoveryDebtCard({ debt, context = 'Z posledních dní', recommendation }: Props) {
  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(79,195,247,0.05), var(--bg-card))', border: '1px solid rgba(79,195,247,0.2)', borderRadius: 16, padding: 16 }}>
      <div className="label-caps" style={{ marginBottom: 8 }}>Recovery Debt</div>
      <div style={{ color: 'var(--recovery-debt)', fontSize: 28, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(debt)}<span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 400 }}> kcal</span>
      </div>
      <div style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 6 }}>{context}</div>
      {recommendation && <div style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5, marginTop: 12 }}>{recommendation}</div>}
    </div>
  );
}

export default RecoveryDebtCard;
