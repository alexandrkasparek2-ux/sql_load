interface Props {
  title: string;
  subtitle: string;
  icon?: string;
  countdown?: { value: string; label: string };
  onClick?: () => void;
}

export function TrainingBanner({ title, subtitle, icon = '⚡', countdown, onClick }: Props) {
  return (
    <button type="button" onClick={onClick} className="tap-scale" style={{ width: '100%', background: 'var(--gradient-action)', border: 0, borderRadius: 14, padding: '14px 16px', color: '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: onClick ? 'pointer' : 'default', animation: 'pulse-glow 3s ease-in-out infinite' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
        <div style={{ width: 34, height: 34, background: 'rgba(0,0,0,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>{title}</div>
          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      {countdown && (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{countdown.value}</div>
          <div style={{ fontSize: 9, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>{countdown.label}</div>
        </div>
      )}
    </button>
  );
}

export default TrainingBanner;
