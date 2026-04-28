interface Props {
  score: number;
  size?: number;
  label?: string;
}

function getScoreColor(score: number) {
  if (score >= 70) return 'var(--status-success)';
  if (score >= 40) return 'var(--brand-primary)';
  return 'var(--brand-accent)';
}

export function ScoreRing({ score, size = 80, label = 'FUELING SCORE' }: Props) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.min(100, Math.max(0, score));
  const offset = circumference * (1 - safeScore / 100);
  const color = getScoreColor(safeScore);
  const gradientId = `score-ring-${size}`;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor="var(--brand-secondary)" />
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
            style={{ filter: 'drop-shadow(0 0 6px rgba(255, 214, 0, 0.35))', transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color, fontSize: size * 0.3, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(safeScore)}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: size * 0.1, marginTop: 2 }}>/100</div>
        </div>
      </div>
      {label && <div style={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</div>}
    </div>
  );
}

export default ScoreRing;
