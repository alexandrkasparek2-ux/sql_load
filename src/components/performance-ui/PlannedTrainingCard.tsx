interface Props {
  icon: string;
  title: string;
  type: string;
  typeColor: string;
  carbsRange: string;
  carbsTotal?: string;
  fluidRate: string;
  date: string;
  onClick: () => void;
}

export function PlannedTrainingCard({ icon, title, type, typeColor, carbsRange, carbsTotal, fluidRate, date, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-scale"
      style={{ width: '100%', textAlign: 'left', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 12, display: 'flex', gap: 12, cursor: 'pointer' }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(179,136,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <div style={{ color: 'var(--brand-primary)', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{date}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ color: typeColor, background: `${typeColor}14`, border: `1px solid ${typeColor}30`, borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 800 }}>{type}</span>
          <span style={{ color: 'var(--brand-primary)', background: 'rgba(124,92,255,0.08)', borderRadius: 6, padding: '3px 8px', fontSize: 10 }}>{carbsRange}</span>
          {carbsTotal && <span style={{ color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', borderRadius: 6, padding: '3px 8px', fontSize: 10 }}>{carbsTotal}</span>}
          <span style={{ color: 'var(--hydration)', background: 'rgba(79,195,247,0.08)', borderRadius: 6, padding: '3px 8px', fontSize: 10 }}>{fluidRate}</span>
        </div>
      </div>
    </button>
  );
}

export default PlannedTrainingCard;
