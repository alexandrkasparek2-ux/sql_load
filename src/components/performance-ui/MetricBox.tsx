import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  variant: 'default' | 'analytics' | 'success' | 'warning';
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const variantStyles = {
  default: { color: 'var(--text-primary)', border: 'var(--border-default)', bg: 'var(--bg-card)' },
  analytics: { color: 'var(--analytics-blue)', border: 'var(--border-analytics)', bg: 'linear-gradient(135deg, rgba(79,195,247,0.06), var(--bg-card))' },
  success: { color: 'var(--status-success)', border: 'var(--border-success)', bg: 'linear-gradient(135deg, rgba(0,229,176,0.06), var(--bg-card))' },
  warning: { color: 'var(--brand-primary)', border: 'var(--border-accent)', bg: 'linear-gradient(135deg, rgba(255,214,0,0.07), var(--bg-card))' },
};

export function MetricBox({ label, value, unit, variant, icon, trend, trendValue }: Props) {
  const style = variantStyles[variant];
  const trendIcon = trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→';

  return (
    <div style={{ background: style.bg, border: `1px solid ${style.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</div>
        {icon && <div style={{ color: style.color, flexShrink: 0 }}>{icon}</div>}
      </div>
      <div style={{ color: style.color, fontSize: 28, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
        {unit && <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 400, marginLeft: 4 }}>{unit}</span>}
      </div>
      {trend && trendValue && (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 8 }}>
          {trendIcon} {trendValue}
        </div>
      )}
    </div>
  );
}

export default MetricBox;
