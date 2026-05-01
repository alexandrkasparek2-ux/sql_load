import React from 'react';

// ──────────────────────────────────────────────────────────
// Theme tokens — Variant A "Power" design
// ──────────────────────────────────────────────────────────
export const T = {
  bg:      '#0b0b0c',
  bg2:     '#131315',
  card:    '#18181b',
  card2:   '#1f1f23',
  border:  '#26262b',
  border2: '#34343a',
  text:    '#f5f5f4',
  text2:   '#a8a8a3',
  muted:   '#6b6b67',
  radius:  14,
} as const;

// Brand / macro palette — Power orange
export const BRAND = {
  gold:    '#ffb000',
  orange:  '#ff5b1f',
  green:   '#7dd87a',
  blue:    '#4cc9ff',
  purple:  '#B388FF',
  red:     '#ff5566',
  gradient: 'linear-gradient(135deg, #ffb000, #ff5b1f)',
} as const;

// Macro nutrient colors
export const MACRO = {
  carb: '#ffb000',
  fat:  '#ff5b1f',
  pro:  '#d6f25c',
  hyd:  '#4cc9ff',
} as const;

// Legacy Apple palette — kept for backward compat
export const APPLE = {
  red:    '#ff5566',
  green:  '#7dd87a',
  blue:   '#4cc9ff',
  orange: '#ff5b1f',
  cyan:   '#4cc9ff',
  yellow: '#ffb000',
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

// ──────────────────────────────────────────────────────────
// ScoreRing — compact numeric score ring (0-100)
// ──────────────────────────────────────────────────────────
interface ScoreRingProps {
  score:     number;
  size?:     number;
  label?:    string;
  sublabel?: string;
  color?:    string;
}

export function ScoreRing({ score, size = 80, label, sublabel, color }: ScoreRingProps) {
  const sw    = Math.max(4, size * 0.065);
  const r     = (size - sw * 2) / 2;
  const circ  = 2 * Math.PI * r;
  const pct   = Math.min(1, Math.max(0, score / 100));
  const offset = circ * (1 - pct);
  const c = color ?? (score >= 80 ? BRAND.green : score >= 60 ? BRAND.gold : score >= 40 ? BRAND.orange : BRAND.red);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a1a" strokeWidth={sw} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)',
            filter:     `drop-shadow(0 0 ${sw}px ${c}88)`,
          }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 1,
      }}>
        <span style={{
          fontSize: size * 0.29, fontWeight: 800, color: c,
          letterSpacing: '-0.04em', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {Math.round(score)}
        </span>
        {label && (
          <span style={{
            fontSize: Math.max(7, size * 0.115), color: T.muted,
            textTransform: 'uppercase' as const, letterSpacing: '0.08em',
            fontWeight: 600, lineHeight: 1,
          }}>
            {label}
          </span>
        )}
        {sublabel && (
          <span style={{ fontSize: Math.max(6, size * 0.1), color: T.muted, opacity: 0.6 }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// MetricBox — compact labelled metric card
// ──────────────────────────────────────────────────────────
interface MetricBoxProps {
  label:  string;
  value:  string | number;
  unit?:  string;
  delta?: number;
  color?: string;
  size?:  'sm' | 'md';
  style?: React.CSSProperties;
}

export function MetricBox({ label, value, unit, delta, color, size = 'md', style }: MetricBoxProps) {
  const fs = size === 'sm' ? 22 : 28;
  return (
    <div style={{
      background:   T.card,
      border:       `1px solid ${T.border}`,
      borderRadius: 12,
      padding:      size === 'sm' ? '12px 14px' : '16px',
      flex:         1,
      minWidth:     0,
      ...style,
    }}>
      <div style={{
        fontSize: 9, color: T.muted, letterSpacing: '1.5px',
        textTransform: 'uppercase' as const, fontWeight: 600, marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{
          fontSize: fs, fontWeight: 800, color: color ?? T.text,
          letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 11, color: T.muted }}>{unit}</span>}
      </div>
      {delta !== undefined && (
        <div style={{
          fontSize: 11, fontWeight: 600, marginTop: 4,
          color: delta >= 0 ? BRAND.green : BRAND.red,
        }}>
          {delta >= 0 ? '+' : ''}{delta}%
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// StatPill — inline colored pill label+value
// ──────────────────────────────────────────────────────────
interface StatPillProps {
  label:  string;
  value:  string | number;
  color?: string;
  unit?:  string;
}

export function StatPill({ label, value, color = BRAND.gold, unit }: StatPillProps) {
  return (
    <div style={{
      display:     'inline-flex',
      alignItems:  'center',
      gap:         6,
      background:  `${color}15`,
      border:      `1px solid ${color}30`,
      borderRadius: 20,
      padding:     '5px 10px',
      flexShrink:  0,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}{unit}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// SegmentedTabs — scrollable tab switcher
// ──────────────────────────────────────────────────────────
interface TabItem { id: string; label: string; badge?: number }

interface SegmentedTabsProps {
  tabs:     TabItem[];
  active:   string;
  onChange: (id: string) => void;
  accent?:  string;
}

export function SegmentedTabs({ tabs, active, onChange, accent = BRAND.gold }: SegmentedTabsProps) {
  return (
    <div style={{
      display:        'flex',
      gap:            2,
      background:     '#0a0a0a',
      border:         `1px solid ${T.border}`,
      borderRadius:   12,
      padding:        3,
      overflowX:      'auto',
      scrollbarWidth: 'none' as const,
      msOverflowStyle: 'none' as unknown as React.CSSProperties['msOverflowStyle'],
    }}>
      {tabs.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex:          1,
              minWidth:      'max-content',
              padding:       '7px 14px',
              borderRadius:  9,
              border:        'none',
              cursor:        'pointer',
              fontSize:      11,
              fontWeight:    isActive ? 700 : 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
              background:    isActive ? accent : 'transparent',
              color:         isActive ? '#000' : T.muted,
              transition:    'background 0.2s, color 0.2s',
              display:       'flex',
              alignItems:    'center',
              gap:           5,
              whiteSpace:    'nowrap' as const,
            }}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span style={{
                background:   isActive ? 'rgba(0,0,0,0.25)' : `${accent}33`,
                color:        isActive ? '#000' : accent,
                borderRadius: 8,
                padding:      '1px 5px',
                fontSize:     9,
                fontWeight:   800,
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// LiveBadge — pulsing live indicator
// ──────────────────────────────────────────────────────────
export function LiveBadge({ label = 'LIVE' }: { label?: string }) {
  return (
    <div style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          5,
      background:   `${BRAND.red}18`,
      border:       `1px solid ${BRAND.red}40`,
      borderRadius: 20,
      padding:      '3px 9px',
      flexShrink:   0,
    }}>
      <div style={{
        width:        6,
        height:       6,
        borderRadius: '50%',
        background:   BRAND.red,
        animation:    'liveBlip 1.5s ease-in-out infinite',
        flexShrink:   0,
      }} />
      <span style={{ fontSize: 9, fontWeight: 800, color: BRAND.red, letterSpacing: '1.5px' }}>
        {label}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// GlowCard — Card variant with optional gradient top line + glow
// ──────────────────────────────────────────────────────────
interface GlowCardProps {
  children:  React.ReactNode;
  accent?:   string;
  glow?:     boolean;
  topLine?:  boolean;
  style?:    React.CSSProperties;
  onClick?:  () => void;
}

export function GlowCard({ children, accent = BRAND.gold, glow = false, topLine = false, style, onClick }: GlowCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background:   T.card,
        border:       `1px solid ${accent}25`,
        borderRadius: T.radius,
        padding:      16,
        cursor:       onClick ? 'pointer' : 'default',
        boxShadow:    glow ? `0 4px 24px ${accent}18` : undefined,
        position:     'relative',
        overflow:     'hidden',
        ...style,
      }}
    >
      {topLine && (
        <div style={{
          position:     'absolute',
          top: 0, left: 0, right: 0,
          height:       2,
          background:   `linear-gradient(90deg, ${accent}, transparent)`,
          borderRadius: `${T.radius}px ${T.radius}px 0 0`,
        }} />
      )}
      {children}
    </div>
  );
}
