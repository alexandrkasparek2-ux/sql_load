import type { ReactNode } from 'react';

interface Props {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  gradientFrom?: string;
  gradientTo?: string;
  children?: ReactNode;
}

export function ProgressRing({
  value,
  max,
  size = 210,
  strokeWidth = 10,
  gradientFrom = 'var(--brand-primary)',
  gradientTo = 'var(--brand-accent)',
  children,
}: Props) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const offset = circumference * (1 - ratio);
  const gradientId = `progress-ring-${size}-${strokeWidth}`;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#151515" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 8px ${gradientFrom})`,
            transition: 'stroke-dashoffset 1.5s ease-out',
          }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

export default ProgressRing;
