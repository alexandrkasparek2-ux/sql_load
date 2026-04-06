import React from 'react';

// ──────────────────────────────────────────────────────────
// Whoop-inspired theme tokens
// ──────────────────────────────────────────────────────────
export const T = {
  bg:     '#0a0a0a',
  card:   '#141414',
  border: '#252525',
  text:   '#f0f0f0',
  muted:  '#5a5a5a',
  radius: 10,
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
  height  = 4,
  showLabel = false,
  animated  = true,
}: ProgressBarProps) {
  const pct    = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const isOver = value > max && max > 0;
  const fill   = isOver ? '#ef4444' : color;

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        height,
        background:   '#1e1e1e',
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
// MacroCard
// ──────────────────────────────────────────────────────────
interface MacroCardProps {
  label:    string;
  value:    number;
  target:   number;
  unit:     string;
  color:    string;
  decimals?: number;
}

export function MacroCard({ label, value, target, unit, color, decimals = 0 }: MacroCardProps) {
  const fmt    = (n: number) => decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
  const pct    = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const isOver = value > target && target > 0;

  return (
    <div style={{
      background:   T.card,
      border:       `1px solid ${T.border}`,
      borderRadius: T.radius,
      padding:      '14px 12px',
      flex:         1,
      minWidth:     0,
    }}>
      <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: T.text, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>
          {fmt(value)}
        </span>
        <span style={{ fontSize: 11, color: T.muted, marginLeft: 1 }}>{unit}</span>
      </div>
      <ProgressBar value={value} max={target} color={color} height={3} />
      <div style={{ fontSize: 10, color: isOver ? '#ef4444' : T.muted, marginTop: 5 }}>
        {isOver ? `+${Math.round(value - target)}${unit} přes cíl` : `${pct}% z ${fmt(target)}${unit}`}
      </div>
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
        <div style={{ fontSize: 13, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: T.muted, marginTop: 2, opacity: 0.7 }}>{sublabel}</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: accent ?? T.text, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.01em' }}>
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
        fontFamily:    'Syne, sans-serif',
        fontSize:      11,
        fontWeight:    700,
        color:         accent ?? T.muted,
        margin:        0,
        textTransform: 'uppercase',
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
    borderRadius:   8,
    cursor:         disabled ? 'not-allowed' : 'pointer',
    border:         '1px solid transparent',
    width:          full ? '100%' : undefined,
    opacity:        disabled ? 0.4 : 1,
    transition:     'opacity 0.15s',
    fontFamily:     'DM Sans, sans-serif',
    letterSpacing:  '0.03em',
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
export function Spinner({ color = '#5a5a5a', size = 24 }: { color?: string; size?: number }) {
  return (
    <div style={{
      width:        size,
      height:       size,
      border:       `2px solid ${color}33`,
      borderTop:    `2px solid ${color}`,
      borderRadius: '50%',
      animation:    'spin 0.8s linear infinite',
    }} />
  );
}

if (typeof document !== 'undefined') {
  const id = 'cyclofuel-spin';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
  }
}
