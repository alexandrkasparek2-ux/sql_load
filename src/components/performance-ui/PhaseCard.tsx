interface Props {
  phase: 1 | 2 | 3;
  title: string;
  subtitle: string;
  active: boolean;
  locked?: boolean;
  onClick: () => void;
}

export function PhaseCard({ phase, title, subtitle, active, locked, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className="tap-scale"
      style={{
        width: '100%',
        textAlign: 'left',
        background: active ? 'linear-gradient(135deg, rgba(255,214,0,0.08), rgba(255,168,0,0.02))' : 'var(--bg-card)',
        border: `1px solid ${active ? 'rgba(255,214,0,0.4)' : 'var(--border-subtle)'}`,
        borderRadius: 14,
        padding: '14px 16px',
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.45 : 1,
        transition: 'transform 150ms ease, border-color 200ms ease, background 200ms ease',
      }}
    >
      <div style={{ color: active ? 'var(--brand-primary)' : 'var(--text-primary)', fontSize: 14, fontWeight: 800, marginBottom: 2 }}>
        Fáze {phase} · {title}
      </div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.45 }}>{subtitle}</div>
    </button>
  );
}

export default PhaseCard;
