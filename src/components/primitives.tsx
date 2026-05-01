import React from 'react';
import { T, MACRO } from './UI';

// ── Ring ──────────────────────────────────────────────────
interface RingProps {
  size?:     number;
  stroke?:   number;
  value?:    number;
  max?:      number;
  color?:    string;
  track?:    string;
  children?: React.ReactNode;
}

export function Ring({
  size = 120, stroke = 10, value = 0, max = 100,
  color = 'var(--accent)', track = 'var(--line)', children,
}: RingProps) {
  const r   = (size - stroke) / 2;
  const c   = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', textAlign: 'center',
      }}>
        {children}
      </div>
    </div>
  );
}

// ── SegRing ───────────────────────────────────────────────
interface Segment { value: number; color: string; }
interface SegRingProps {
  size?:     number;
  stroke?:   number;
  segments?: Segment[];
  track?:    string;
  children?: React.ReactNode;
}

export function SegRing({
  size = 160, stroke = 14, segments = [], track = 'var(--line)', children,
}: SegRingProps) {
  const r     = (size - stroke) / 2;
  const c     = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * c * 0.95;
          const off = c * (1 - acc / total) + c * 0.025;
          acc += seg.value;
          return (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={seg.color}
              strokeWidth={stroke} fill="none"
              strokeDasharray={`${len} ${c}`} strokeDashoffset={off} strokeLinecap="butt" />
          );
        })}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', textAlign: 'center',
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Bar ───────────────────────────────────────────────────
interface BarProps {
  value?:  number;
  max?:    number;
  color?:  string;
  track?:  string;
  height?: number;
  radius?: number;
}

export function Bar({
  value = 0, max = 100, color = 'var(--accent)',
  track = 'var(--line)', height = 6, radius = 999,
}: BarProps) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0)) * 100;
  return (
    <div style={{ width: '100%', height, background: track, borderRadius: radius, overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%', background: color,
        borderRadius: radius, transition: 'width 0.5s ease',
      }} />
    </div>
  );
}

// ── MacroBar ──────────────────────────────────────────────
interface MacroBarProps {
  carb?:   number;
  fat?:    number;
  pro?:    number;
  height?: number;
  track?:  string;
}

export function MacroBar({ carb = 0, fat = 0, pro = 0, height = 6, track = 'var(--line)' }: MacroBarProps) {
  const total = Math.max(1, carb + fat + pro);
  return (
    <div style={{
      width: '100%', height, background: track,
      borderRadius: 999, display: 'flex', overflow: 'hidden', gap: 1,
    }}>
      <div style={{ flex: carb / total, background: MACRO.carb }} />
      <div style={{ flex: fat  / total, background: MACRO.fat  }} />
      <div style={{ flex: pro  / total, background: MACRO.pro  }} />
    </div>
  );
}

// ── MacroLine ─────────────────────────────────────────────
interface MacroLineProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

export function MacroLine({ label, value, total, color }: MacroLineProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: T.text2, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: T.text, fontWeight: 600 }}>{Math.round(value)}</span>
          <span style={{ color: T.muted }}> / {Math.round(total)} g</span>
        </span>
      </div>
      <Bar value={value} max={total} color={color} height={4} />
    </div>
  );
}

// ── KV ────────────────────────────────────────────────────
interface KVProps {
  k:        string;
  v:        string | number;
  sub?:     string;
  vSize?:   number;
  vColor?:  string;
  mono?:    boolean;
  align?:   'left' | 'right' | 'center';
}

export function KV({ k, v, sub, vSize = 22, vColor = T.text, mono = true, align = 'left' }: KVProps) {
  return (
    <div style={{ textAlign: align }}>
      <div style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
        color: T.muted, fontFamily: 'JetBrains Mono, monospace', marginBottom: 5,
      }}>
        {k}
      </div>
      <div style={{
        fontSize: vSize, fontWeight: 600, color: vColor, lineHeight: 1,
        fontFamily: mono ? 'JetBrains Mono, monospace' : "'Space Grotesk', Inter, sans-serif",
        fontVariantNumeric: 'tabular-nums',
      }}>
        {v}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

// ── Chip ──────────────────────────────────────────────────
interface ChipProps {
  active?:   boolean;
  color?:    string;
  onClick?:  () => void;
  children:  React.ReactNode;
}

export function Chip({ children, active = false, color = 'var(--accent)', onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px', borderRadius: 999, flexShrink: 0,
        border: `1px solid ${active ? color : 'var(--line)'}`,
        background: active ? color : 'transparent',
        color: active ? '#0a0a0a' : T.text2,
        fontSize: 12, fontWeight: 500, letterSpacing: '0.01em',
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

// ── LivePill ──────────────────────────────────────────────
interface LivePillProps {
  color?:    string;
  children?: React.ReactNode;
}

export function LivePill({ children = 'LIVE', color = 'var(--bad)' }: LivePillProps) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 8px', borderRadius: 4,
      background: `${color}1a`,
      color, fontSize: 10, fontWeight: 600,
      letterSpacing: '0.12em',
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 999, background: color,
        animation: 'pulse 1.4s ease-in-out infinite',
      }} />
      {children}
    </span>
  );
}

// ── Elevation ─────────────────────────────────────────────
interface ElevationProps {
  width?:  number;
  height?: number;
  color?:  string;
  fill?:   string;
}

export function Elevation({
  width = 320, height = 70,
  color = 'var(--accent)', fill = 'rgba(255,91,31,0.18)',
}: ElevationProps) {
  const pts = [10, 18, 22, 30, 28, 40, 55, 50, 62, 70, 58, 48, 60, 78, 65, 50, 42, 38, 30, 22, 18, 14];
  const max = Math.max(...pts);
  const dx   = width / (pts.length - 1);
  const norm = (v: number) => height - (v / max) * height * 0.85;
  const top  = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * dx} ${norm(v)}`).join(' ');
  const area = `${top} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: 'block', width: '100%' }}>
      <path d={area} fill={fill} />
      <path d={top} stroke={color} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
    </svg>
  );
}

// ── BarChart ──────────────────────────────────────────────
interface BarChartProps {
  data?:    number[];
  labels?:  string[];
  width?:   number;
  height?:  number;
  color?:   string;
  gap?:     number;
}

export function BarChart({
  data = [], labels = [], width = 220, height = 60,
  color = 'var(--accent)', gap = 4,
}: BarChartProps) {
  const max = Math.max(...data, 1);
  const bw  = (width - gap * (data.length - 1)) / data.length;
  return (
    <svg width={width} height={height + 14} style={{ display: 'block', width: '100%' }}>
      {data.map((v, i) => {
        const h = (v / max) * height;
        return (
          <g key={i}>
            <rect x={i * (bw + gap)} y={height - h} width={bw} height={h} rx={2}
              fill={color} opacity={i === data.length - 1 ? 1 : 0.4} />
            {labels[i] && (
              <text
                x={i * (bw + gap) + bw / 2} y={height + 11}
                fontSize="9" fill={T.muted} textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
              >
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
