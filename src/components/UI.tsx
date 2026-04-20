import React from 'react';

// ──────────────────────────────────────────────────────────
// Theme tokens — Hybrid Performance design
// ──────────────────────────────────────────────────────────
export const T = {
  bg:     '#050505',
  card:   '#0d0d0d',
  border: '#1a1a1a',
  text:   '#ffffff',
  muted:  '#666666',
  radius: 12,
} as const;

// Brand / macro palette
export const BRAND = {
  gold:    '#FFD600',
  orange:  '#FF6B35',
  green:   '#00E5B0',
  blue:    '#4FC3F7',
  purple:  '#B388FF',
  red:     '#FF5252',
  gradient: 'linear-gradient(135deg, #FFD600, #FF6B35)',
} as const;

// Legacy Apple palette — kept for backward compat, mapped to new palette
export const APPLE = {
  red:    '#FF5252',
  green:  '#00E5B0',
  blue:   '#4FC3F7',
  orange: '#FF6B35',
  cyan:   '#4FC3F7',
  yellow: '#FFD600',
} as const;

// ──────────────────────────────────────────────────────────
// ProgressRing — animated SVG hero ring
// ──────────────────────────────────────────────────────────
interface ProgressRingProps {
  value:       number;
  max:         number;
  size?:       number;
  strokeWidth?: number;
  gradient?:   [string, string];
  children?:   React.ReactNode;
}

export function ProgressRing({
  value, max,
  size        = 210,
  strokeWidth = 10,
  gradient    = ['#FFD600', '#FF6B35'],
  children,
}: ProgressRingProps) {
  const r     = (size - strokeWidth * 2) / 2;
  const circ  = 2 * Math.PI * r;
  const pct   = max > 0 ? Math.min(1, value / max) : 0;
  const offset = circ * (1 - pct);
  const gid   = `rg${gradient[0].replace('#', '')}`;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor={gradient[0]} />
            <stop offset="100%" stopColor={gradient[1]} />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#151515" strokeWidth={strokeWidth} />
        {/* Progress arc */}
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            filter:     `drop-shadow(0 0 8px ${gradient[0]}66)`,
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {children}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// ProgressBar
// ──────────────────────────────────────────────────────────
interface ProgressBarProps {
  value:      number;
  max:        number;
  color?:     string;
  height?:    number;
  showLabel?: boolean;
  animated?:  boolean;
}

export function ProgressBar({
  value, max,
  color     = BRAND.green,
  height    = 4,
  showLabel = false,
  animated  = true,
}: ProgressBarProps) {
  const pct    = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const isOver = value > max && max > 0;
  const fill   = isOver ? BRAND.red : color;

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        height,
        background:   '#1a1a1a',
        borderRadius: height,
        overflow:     'hidden',
        position:     'relative',
      }}>
        <div style={{
          height:       '100%',
          width:        `${pct}%`,
          background:   fill,
          borderRadius: height,
          transition:   animated ? 'width 0.5s cubic-bezier(0.4,0,0.2,1)' : 'none',
        }} />
      </div>
      {showLabel && (
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2, textAlign: 'right' }}>
          {pct.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// MacroCard — 3-column grid card with bottom bar
// ──────────────────────────────────────────────────────────
interface MacroCardProps {
  label:     string;
  value:     number;
  target:    number;
  unit:      string;
  color:     string;
  decimals?: number;
}

export function MacroCard({ label, value, target, unit, color, decimals = 0 }: MacroCardProps) {
  const fmt    = (n: number) => decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
  const pct    = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const isOver = value > target && target > 0;

  return (
    <div style={{
      background:   T.card,
      border:       `1px solid ${T.border}`,
      borderRadius: 14,
      padding:      '14px 12px',
      flex:         1,
      minWidth:     0,
      position:     'relative',
      overflow:     'hidden',
      cursor:       'default',
    }}>
      <div style={{
        fontSize: 9, color: T.muted, letterSpacing: '1.5px',
        textTransform: 'uppercase' as const, marginBottom: 6, fontWeight: 600,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span style={{
          fontSize: 22, fontWeight: 800, color: T.text,
          letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums',
        }}>
          {fmt(value)}
        </span>
        <span style={{ fontSize: 11, color: T.muted, marginLeft: 2, fontWeight: 400 }}>{unit}</span>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 8, fontSize: 10, color: T.muted,
      }}>
        <span>cíl {fmt(target)}</span>
        <span style={{ color: isOver ? BRAND.red : color, fontWeight: 600 }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      {/* Bottom progress bar */}
      <div style={{
        position:     'absolute',
        bottom:       0,
        left:         0,
        height:       3,
        width:        `${Math.min(pct, 100)}%`,
        background:   color,
        borderRadius: '0 2px 0 0',
        transition:   'width 1s ease-out',
      }} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// StatRow
// ──────────────────────────────────────────────────────────
interface StatRowProps {
  label:     string;
  value:     string | number;
  unit?:     string;
  sublabel?: string;
  accent?:   string;
}

export function StatRow({ label, value, unit, sublabel, accent }: StatRowProps) {
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      padding:        '11px 0',
      borderBottom:   `1px solid ${T.border}`,
    }}>
      <div>
        <div style={{ fontSize: 13, color: T.muted, textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 500 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: T.muted, marginTop: 2, opacity: 0.7 }}>{sublabel}</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: accent ?? T.text, letterSpacing: '-0.01em' }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 11, color: T.muted, marginLeft: 3 }}>{unit}</span>}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Card
// ──────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?:   React.CSSProperties;
  onClick?: () => void;
  accent?:  string;
  glow?:    boolean;
}

export function Card({ children, style, onClick, accent, glow }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background:   T.card,
        border:       `1px solid ${accent ? accent + '30' : T.border}`,
        borderRadius: T.radius,
        padding:      16,
        cursor:       onClick ? 'pointer' : 'default',
        boxShadow:    glow && accent ? `0 0 24px ${accent}18` : undefined,
        transition:   'border-color 0.2s',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// SectionTitle
// ──────────────────────────────────────────────────────────
interface SectionTitleProps {
  children: React.ReactNode;
  accent?:  string;
  right?:   React.ReactNode;
}

export function SectionTitle({ children, accent, right }: SectionTitleProps) {
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      marginBottom:   10,
    }}>
      <h2 style={{
        fontSize:      11,
        fontWeight:    700,
        color:         accent ?? T.muted,
        margin:        0,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
      }}>
        {children}
      </h2>
      {right && <div>{right}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Btn
// ──────────────────────────────────────────────────────────
interface BtnProps {
  children:  React.ReactNode;
  onClick?:  () => void;
  accent:    string;
  variant?:  'solid' | 'outline' | 'ghost';
  size?:     'sm' | 'md' | 'lg';
  disabled?: boolean;
  full?:     boolean;
  type?:     'button' | 'submit' | 'reset';
}

export function Btn({
  children, onClick, accent, variant = 'solid',
  size = 'md', disabled = false, full = false, type = 'button',
}: BtnProps) {
  const pad = size === 'sm' ? '7px 14px' : size === 'lg' ? '14px 28px' : '10px 20px';
  const fs  = size === 'sm' ? 12 : size === 'lg' ? 15 : 13;

  const styles: React.CSSProperties = {
    padding:        pad,
    fontSize:       fs,
    fontWeight:     700,
    borderRadius:   10,
    cursor:         disabled ? 'not-allowed' : 'pointer',
    border:         '1px solid transparent',
    width:          full ? '100%' : undefined,
    opacity:        disabled ? 0.4 : 1,
    transition:     'opacity 0.15s, transform 0.1s',
    letterSpacing:  '0.05em',
    textTransform:  'uppercase' as const,
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
  };

  if (variant === 'solid') {
    styles.background = accent;
    styles.color      = '#000';
  } else if (variant === 'outline') {
    styles.background  = 'transparent';
    styles.borderColor = accent;
    styles.color       = accent;
  } else {
    styles.background = `${accent}18`;
    styles.color      = accent;
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} style={styles}>
      {children}
    </button>
  );
}

// ──────────────────────────────────────────────────────────
// Spinner
// ──────────────────────────────────────────────────────────
export function Spinner({ color = '#666666', size = 24 }: { color?: string; size?: number }) {
  return (
    <div style={{
      width:        size,
      height:       size,
      border:       `2px solid ${color}33`,
      borderTop:    `2px solid ${color}`,
      borderRadius: '50%',
      animation:    'spin 0.8s linear infinite',
      flexShrink:   0,
    }} />
  );
}

// ──────────────────────────────────────────────────────────
// Skeleton — shimmer placeholder for loading states
// ──────────────────────────────────────────────────────────
export function Skeleton({
  width, height = 16, borderRadius = 8, style,
}: {
  width?:        string | number;
  height?:       string | number;
  borderRadius?: number;
  style?:        React.CSSProperties;
}) {
  return (
    <div style={{
      width:           width ?? '100%',
      height,
      borderRadius,
      background:      'linear-gradient(90deg, #111 25%, #1c1c1c 50%, #111 75%)',
      backgroundSize:  '200% 100%',
      animation:       'shimmer 1.5s infinite',
      flexShrink:      0,
      ...style,
    }} />
  );
}
