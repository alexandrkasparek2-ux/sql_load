interface Props {
  variant: 'sync' | 'live' | 'rest';
}

const variants = {
  sync: { label: 'Sync', color: 'var(--status-success)', bg: 'rgba(0,229,176,0.10)' },
  live: { label: 'Live', color: 'var(--brand-accent)', bg: 'rgba(124,92,255,0.12)' },
  rest: { label: 'Rest', color: 'var(--analytics-blue)', bg: 'rgba(79,195,247,0.10)' },
};

export function LiveBadge({ variant }: Props) {
  const item = variants[variant];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, border: `1px solid ${item.color}`, background: item.bg, color: item.color, fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, animation: variant === 'live' ? 'live-pulse 1.2s infinite' : 'pulse 2s infinite' }} />
      {item.label}
    </div>
  );
}

export default LiveBadge;
