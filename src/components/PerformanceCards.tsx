import { T, BRAND } from './UI';
import type { DayKcal } from '../hooks/useWeeklyData';
import type { IntervalsActivity } from '../services/intervalsService';
import type { PlannedWorkout } from '../services/trainingPeaksService';
import { activityKcal, sportIcon, formatDuration } from '../services/intervalsService';
import { classifyWorkout, calculateFuelingTargets, FUEL_TYPE_META } from '../services/fuelingPlanner';
import { CompactFuelingBadges } from './WorkoutFuelPlannerCard';

// ──────────────────────────────────────────────────────────
// WeekChart — enhanced weekly kcal chart with gradient bars
// ──────────────────────────────────────────────────────────
interface WeekChartProps {
  data:      DayKcal[];
  accent:    string;
  kcalGoal:  number;
  showBurn?: boolean;
}

export function WeekChart({ data, accent, kcalGoal, showBurn = true }: WeekChartProps) {
  const today  = new Date().toISOString().split('T')[0];
  const last7  = data.slice(-7);
  const hasBurn = showBurn && last7.some(d => d.burned > 0);
  const maxVal = Math.max(...last7.map(d => Math.max(d.kcal, d.goal || kcalGoal, d.burned || 0)), kcalGoal, 1);

  const barW = 34;
  const gap  = 6;
  const H    = 80;
  const W    = last7.length * (barW + gap);

  return (
    <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
      <svg viewBox={`0 0 ${W} ${H + 36}`} width={W} height={H + 36} style={{ display: 'block', overflow: 'visible', minWidth: '100%' }}>
        <defs>
          <linearGradient id="wc-bar-today" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor={accent + '88'} />
          </linearGradient>
          <linearGradient id="wc-bar-past" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent + '66'} />
            <stop offset="100%" stopColor={accent + '22'} />
          </linearGradient>
          <linearGradient id="wc-bar-over" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND.red} />
            <stop offset="100%" stopColor={BRAND.red + '55'} />
          </linearGradient>
        </defs>
        {last7.map((d, i) => {
          const x        = i * (barW + gap);
          const dayGoal  = d.goal > 0 ? d.goal : kcalGoal;
          const barH     = d.kcal > 0 ? Math.max(4, (d.kcal / maxVal) * H) : 0;
          const y        = H - barH;
          const isToday  = d.date === today;
          const overGoal = d.kcal > 0 && dayGoal > 0 && d.kcal > dayGoal * 1.12;
          const fill     = isToday ? 'url(#wc-bar-today)' : overGoal ? 'url(#wc-bar-over)' : 'url(#wc-bar-past)';
          const goalY    = dayGoal > 0 ? H - (dayGoal / maxVal) * H : -1;

          return (
            <g key={d.date}>
              {/* Background track */}
              <rect x={x} y={0} width={barW} height={H} rx={4} fill={T.border + '60'} />
              {/* Filled bar */}
              {d.kcal > 0 && (
                <rect
                  x={x} y={y} width={barW} height={barH} rx={4}
                  fill={fill}
                  style={{ filter: isToday ? `drop-shadow(0 0 6px ${accent}66)` : 'none' }}
                />
              )}
              {/* Goal line */}
              {dayGoal > 0 && goalY >= 0 && (
                <line
                  x1={x + 2} y1={goalY} x2={x + barW - 2} y2={goalY}
                  stroke={accent} strokeWidth={1.5} strokeDasharray="4,3" opacity={0.6}
                />
              )}
              {/* Burn dot */}
              {hasBurn && d.burned > 0 && (
                <circle
                  cx={x + barW / 2}
                  cy={H - (d.burned / maxVal) * H}
                  r={3}
                  fill={BRAND.orange}
                />
              )}
              {/* Today indicator dot */}
              {isToday && (
                <circle cx={x + barW / 2} cy={H + 7} r={2.5} fill={accent} />
              )}
              {/* Day label */}
              <text x={x + barW / 2} y={H + 20} textAnchor="middle" fontSize={9}
                fill={isToday ? accent : '#666'} fontWeight={isToday ? '700' : '400'}>
                {d.label}
              </text>
              {/* Date number */}
              <text x={x + barW / 2} y={H + 31} textAnchor="middle" fontSize={7} fill="#444">
                {d.dateNum}
              </text>
              {/* Value label above bar */}
              {d.kcal > 0 && (
                <text x={x + barW / 2} y={Math.max(y - 4, 9)} textAnchor="middle"
                  fontSize={7} fill={isToday ? accent : '#555'} fontWeight={isToday ? '700' : '400'}>
                  {d.kcal >= 1000 ? `${(d.kcal / 1000).toFixed(1)}k` : String(Math.round(d.kcal))}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// IntakeRing — compact single-macro ring
// ──────────────────────────────────────────────────────────
interface IntakeRingProps {
  value:  number;
  target: number;
  label:  string;
  unit:   string;
  color:  string;
  size?:  number;
}

export function IntakeRing({ value, target, label, unit, color, size = 64 }: IntakeRingProps) {
  const sw    = Math.max(3, size * 0.06);
  const r     = (size - sw * 2) / 2;
  const circ  = 2 * Math.PI * r;
  const pct   = target > 0 ? Math.min(1, value / target) : 0;
  const offset = circ * (1 - pct);
  const isOver = value > target && target > 0;
  const c = isOver ? BRAND.red : color;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a1a" strokeWidth={sw} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={sw}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 3px ${c}66)` }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 0,
        }}>
          <span style={{ fontSize: size * 0.22, fontWeight: 800, color: c, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(value)}
          </span>
          <span style={{ fontSize: size * 0.14, color: T.muted, lineHeight: 1 }}>{unit}</span>
        </div>
      </div>
      <span style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' as const, letterSpacing: '1px', fontWeight: 600, textAlign: 'center' }}>
        {label}
      </span>
      <span style={{ fontSize: 8, color: T.muted, opacity: 0.7 }}>
        / {Math.round(target)}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// MacroRingRow — 4 IntakeRings in a row
// ──────────────────────────────────────────────────────────
interface MacroRingRowProps {
  totals:  { kcal: number; carbs: number; protein: number; fat: number };
  goals:   { kcal: number; carbs: number; protein: number; fat: number };
  accent?: string;
  size?:   number;
}

export function MacroRingRow({ totals, goals, accent = BRAND.gold, size = 70 }: MacroRingRowProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', gap: 8, padding: '8px 0' }}>
      <IntakeRing value={totals.carbs}   target={goals.carbs}   label="Sacharidy" unit="g" color={accent}       size={size} />
      <IntakeRing value={totals.protein} target={goals.protein} label="Bílkoviny" unit="g" color={BRAND.green}  size={size} />
      <IntakeRing value={totals.fat}     target={goals.fat}     label="Tuky"      unit="g" color={BRAND.orange} size={size} />
      <IntakeRing value={totals.kcal / 1000} target={goals.kcal / 1000} label="Kalorie" unit="k" color={BRAND.blue} size={size} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// TrainingBanner — hero section for training type
// ──────────────────────────────────────────────────────────
interface TrainingBannerProps {
  trainingLabel: string;
  trainingIcon:  string;
  totalHours:    number;
  accent:        string;
  message:       string;
  usingTP?:      boolean;
  tpTitle?:      string;
}

export function TrainingBanner({ trainingLabel, trainingIcon, totalHours, accent, message, usingTP, tpTitle }: TrainingBannerProps) {
  return (
    <div style={{
      background:   `linear-gradient(135deg, ${accent}18, ${accent}08)`,
      border:       `1px solid ${accent}30`,
      borderRadius: 16,
      padding:      '16px 18px',
      marginBottom: 16,
      position:     'relative',
      overflow:     'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -20, right: -20,
        fontSize: 80, opacity: 0.06, lineHeight: 1,
        userSelect: 'none',
      }}>
        {trainingIcon}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: `${accent}20`, border: `1px solid ${accent}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0,
        }}>
          {trainingIcon}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: T.text, letterSpacing: '-0.02em' }}>
              {usingTP && tpTitle ? tpTitle : trainingLabel}
            </span>
            {usingTP && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: BRAND.purple,
                background: `${BRAND.purple}18`, border: `1px solid ${BRAND.purple}33`,
                borderRadius: 5, padding: '2px 6px', letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              }}>
                TP
              </span>
            )}
          </div>
          {totalHours > 0 && (
            <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>
              {totalHours.toFixed(1)} h
            </div>
          )}
        </div>
      </div>
      <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{message}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// ActivityFeedCard — single Intervals.icu activity row
// ──────────────────────────────────────────────────────────
interface ActivityFeedCardProps {
  activity: IntervalsActivity;
  accent?:  string;
}

export function ActivityFeedCard({ activity: act, accent = BRAND.blue }: ActivityFeedCardProps) {
  const kcal = activityKcal(act);
  const km   = act.distance > 0 ? (act.distance / 1000).toFixed(1) : null;
  const elev = act.total_elevation_gain > 0 ? Math.round(act.total_elevation_gain) : null;

  const chips: Array<{ icon: string; text: string }> = [{ icon: '⏱', text: formatDuration(act.moving_time) }];
  if (km)                        chips.push({ icon: '📍', text: `${km} km` });
  if (elev)                      chips.push({ icon: '⛰', text: `+${elev} m` });
  if (act.average_heartrate)     chips.push({ icon: '❤️', text: `${Math.round(act.average_heartrate)} bpm` });
  if (act.icu_weighted_avg_watts) chips.push({ icon: '⚡', text: `${Math.round(act.icu_weighted_avg_watts)} W` });
  if (act.icu_training_load)     chips.push({ icon: '📊', text: `TSS ${Math.round(act.icu_training_load)}` });

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
      padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 3, height: '100%',
        background: accent, borderRadius: '3px 0 0 3px',
      }} />
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: `${accent}18`, border: `1px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
      }}>
        {sportIcon(act.type)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 7,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {act.name}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
          {chips.map(chip => (
            <span key={chip.text} style={{
              fontSize: 10, color: T.muted, background: T.bg,
              border: `1px solid ${T.border}`, borderRadius: 6, padding: '3px 7px',
            }}>
              {chip.icon} {chip.text}
            </span>
          ))}
        </div>
      </div>
      {kcal > 0 && (
        <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: BRAND.gold }}>{kcal.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>kcal</div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// PlannedWorkoutCard — TrainingPeaks planned workout
// ──────────────────────────────────────────────────────────
const CS_DAYS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
function tpDateLabel(iso: string): string {
  const today = new Date().toISOString().split('T')[0];
  const tom   = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
  if (iso === today) return 'Dnes';
  if (iso === tom)   return 'Zítra';
  const d = new Date(iso + 'T00:00:00');
  return `${CS_DAYS[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`;
}

interface PlannedWorkoutCardProps {
  workout: PlannedWorkout;
  today:   string;
}

export function PlannedWorkoutCard({ workout: w, today }: PlannedWorkoutCardProps) {
  const wType   = classifyWorkout(w);
  const targets = calculateFuelingTargets(w, wType);
  const meta    = FUEL_TYPE_META[wType];
  const isToday = w.date === today;
  const accent  = isToday ? BRAND.gold : BRAND.purple;

  return (
    <div style={{
      background: T.card, border: `1px solid ${accent}33`,
      borderRadius: 14, padding: '12px 14px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${accent}, transparent)`,
      }} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: `${BRAND.purple}18`, border: `1px solid ${BRAND.purple}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>
          {w.sportType === 'Ride' || w.sportType === 'VirtualRide' ? '🚴' :
           w.sportType === 'Run'  ? '🏃' : w.sportType === 'Swim' ? '🏊' : '🏋️'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {w.title}
            </span>
            <span style={{ fontSize: 10, color: isToday ? BRAND.gold : T.muted, fontWeight: isToday ? 700 : 400, flexShrink: 0 }}>
              {tpDateLabel(w.date)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, marginBottom: 8 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, color: meta.color,
              background: `${meta.color}18`, border: `1px solid ${meta.color}30`,
              borderRadius: 5, padding: '2px 7px', letterSpacing: '0.06em', textTransform: 'uppercase' as const,
            }}>
              {meta.label}
            </span>
            {w.durationMin > 0 && (
              <span style={{ fontSize: 10, color: T.muted, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 7px' }}>
                ⏱ {w.durationMin >= 60 ? `${Math.floor(w.durationMin / 60)}h${w.durationMin % 60 > 0 ? ` ${w.durationMin % 60}min` : ''}` : `${w.durationMin} min`}
              </span>
            )}
            {w.tss > 0 && (
              <span style={{ fontSize: 10, color: T.muted, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 7px' }}>
                📊 TSS {w.tss}
              </span>
            )}
          </div>
          {isToday && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              <CompactFuelingBadges workout={w} />
            </div>
          )}
          {!isToday && targets.carbsPerHourMin > 0 && (
            <div style={{ fontSize: 11, color: T.muted }}>
              {targets.carbsPerHourMin}–{targets.carbsPerHourMax} g S/h
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// RecoveryBadge — recovery level indicator
// ──────────────────────────────────────────────────────────
interface RecoveryBadgeProps {
  level:    string;
  adjusted: number;
}

export function RecoveryBadge({ level, adjusted }: RecoveryBadgeProps) {
  const color = level === 'Vysoký' ? BRAND.red : level === 'Střední' ? BRAND.orange : BRAND.green;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: `${color}15`, border: `1px solid ${color}30`,
      borderRadius: 20, padding: '5px 12px',
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: T.muted }}>{level} dluh</span>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{adjusted} kcal</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// PriorityRow — single daily priority item
// ──────────────────────────────────────────────────────────
interface PriorityRowProps {
  rank:    number;
  text:    string;
  color:   string;
}

export function PriorityRow({ rank, text, color }: PriorityRowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: T.bg, borderRadius: 10, padding: '10px 12px',
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 6, background: `${color}20`,
        border: `1px solid ${color}40`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, color }}>{rank}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}
