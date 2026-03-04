import React from 'react';

// ──────────────────────────────────────────────────────────
// Theme tokens
// ──────────────────────────────────────────────────────────
export const T = {
  bg:     '#080c14',
  card:   '#0f1624',
  border: '#1a2235',
  text:   '#e2e8f0',
  muted:  '#64748b',
  radius: 14,
} as const;

// ──────────────────────────────────────────────────────────
// ProgressBar
// ──────────────────────────────────────────────────────────
interface ProgressBarProps {
  value:       number;
  max:         number;
  color?:      string;
  height?:     number;
  showLabel?:  boolean;
  animated?:   boolean;
}

export function ProgressBar({
  value,
  max,
  color   = '#22c55e',
  height  = 6,
  showLabel = false,
  animated  = true,
}: ProgressBarProps) {
  const pct   = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const isOver = value > max && max > 0;
  const fill   = isOver ? '#ef4444' : color;

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        height,
        background:   T.border,
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
          boxShadow:    pct > 5 ? `0 0 8px ${fill}66` : 'none',
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
// MacroCard
// ──────────────────────────────────────────────────────────
interface MacroCardProps {
  label:   string;
  value:   number;
  target:  number;
  unit:    string;
  color:   string;
  decimals?: number;
}

export function MacroCard({ label, value, target, unit, color, decimals = 0 }: MacroCardProps) {
  const fmt = (n: number) => decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();

  return (
    <div style={{
      background:   T.card,
      border:       `1px solid ${T.border}`,
      borderRadius: T.radius,
      padding:      '12px 14px',
      flex:         1,
      minWidth:     0,
    }}>
      <div style={{ fontSize: 11, color: T.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 6 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: T.text, fontFamily: 'Syne, sans-serif' }}>
          {fmt(value)}
        </span>
        <span style={{ fontSize: 12, color: T.muted }}>{unit}</span>
      </div>
      <ProgressBar value={value} max={target} color={color} height={4} />
      <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
        Cíl: {fmt(target)}{unit}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// StatRow
// ──────────────────────────────────────────────────────────
interface StatRowProps {
  label:    string;
  value:    string | number;
  unit?:    string;
  sublabel?: string;
  accent?:  string;
}

export function StatRow({ label, value, unit, sublabel, accent }: StatRowProps) {
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      padding:        '10px 0',
      borderBottom:   `1px solid ${T.border}`,
    }}>
      <div>
        <div style={{ fontSize: 14, color: T.text }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>{sublabel}</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: accent ?? T.text, fontFamily: 'Syne, sans-serif' }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 12, color: T.muted, marginLeft: 2 }}>{unit}</span>}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Card
// ──────────────────────────────────────────────────────────
interface CardProps {
  children:  React.ReactNode;
  style?:    React.CSSProperties;
  onClick?:  () => void;
  accent?:   string;
  glow?:     boolean;
}

export function Card({ children, style, onClick, accent, glow }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background:   T.card,
        border:       `1px solid ${accent ? accent + '44' : T.border}`,
        borderRadius: T.radius,
        padding:      16,
        cursor:       onClick ? 'pointer' : 'default',
        boxShadow:    glow && accent ? `0 0 20px ${accent}22` : undefined,
        transition:   'border-color 0.2s, box-shadow 0.2s',
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
      marginBottom:   12,
    }}>
      <h2 style={{
        fontFamily:  'Syne, sans-serif',
        fontSize:    16,
        fontWeight:  700,
        color:       accent ?? T.text,
        margin:      0,
      }}>
        {children}
      </h2>
      {right && <div>{right}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Btn – reusable button
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
  const pad  = size === 'sm' ? '6px 14px' : size === 'lg' ? '14px 28px' : '10px 20px';
  const fs   = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;

  const styles: React.CSSProperties = {
    padding:      pad,
    fontSize:     fs,
    fontWeight:   600,
    borderRadius: 10,
    cursor:       disabled ? 'not-allowed' : 'pointer',
    border:       '1px solid transparent',
    width:        full ? '100%' : undefined,
    opacity:      disabled ? 0.5 : 1,
    transition:   'opacity 0.15s, background 0.15s',
    fontFamily:   'DM Sans, sans-serif',
    display:      'inline-flex',
    alignItems:   'center',
    justifyContent: 'center',
    gap:          6,
  };

  if (variant === 'solid') {
    styles.background = accent;
    styles.color      = '#fff';
    styles.boxShadow  = `0 0 12px ${accent}55`;
  } else if (variant === 'outline') {
    styles.background    = 'transparent';
    styles.borderColor   = accent;
    styles.color         = accent;
  } else {
    styles.background = `${accent}1a`;
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
export function Spinner({ color = '#64748b', size = 24 }: { color?: string; size?: number }) {
  return (
    <div style={{
      width:  size,
      height: size,
      border: `2px solid ${color}33`,
      borderTop: `2px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}

// Inject global keyframe for spinner
if (typeof document !== 'undefined') {
  const id = 'cyclofuel-spin';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
  }
}
