// ============================================================
// WeeklyComplianceChart.tsx
// Týdenní compliance graf — bar chart (skutečné vs. cílové kcal),
// čárový trend sacharidů a compliance skóre 0–100 %.
// ============================================================

import { todayLocalISO } from '../../utils/date';
import type { DailyComplianceEntry } from '../../hooks/useNutritionCompliance';

interface Props {
  entries:      DailyComplianceEntry[];
  weeklyScore:  number;
}

const DAY_CS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

function dayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return DAY_CS[d.getDay()];
}

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

export function WeeklyComplianceChart({ entries, weeklyScore }: Props) {
  const today      = todayLocalISO();
  const maxKcal    = Math.max(...entries.map(e => Math.max(e.actual_kcal, e.target_kcal)), 1);
  const chartH     = 100; // výška grafu v px
  const barH       = chartH - 24; // místo pro den label

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 18 }}>
      {/* Header s celkovým skóre */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="label-caps" style={{ color: 'var(--brand-primary)' }}>
          Týdenní compliance
        </div>
        <div style={{
          background: `${scoreColor(weeklyScore)}22`,
          border: `1px solid ${scoreColor(weeklyScore)}55`,
          borderRadius: 20, padding: '4px 12px',
          color: scoreColor(weeklyScore), fontSize: 14, fontWeight: 900,
        }}>
          {weeklyScore} %
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: chartH, marginBottom: 12 }}>
        {entries.map(entry => {
          const isToday     = entry.date === today;
          const actualH     = Math.max(2, (entry.actual_kcal / maxKcal) * barH);
          const targetY     = barH - (entry.target_kcal / maxKcal) * barH;
          const over        = entry.actual_kcal > entry.target_kcal * 1.05;
          const barColor    = isToday ? 'var(--brand-gradient,#7C5CFF)' : over ? '#ef444488' : 'rgba(53,64,82,0.9)';

          return (
            <div key={entry.date} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: 28, height: barH, display: 'flex', alignItems: 'flex-end' }}>
                {/* Cílová linie */}
                {entry.target_kcal > 0 && (
                  <div style={{
                    position: 'absolute', left: 0, right: 0, top: targetY, height: 2,
                    background: 'var(--brand-primary)', borderRadius: 2, opacity: 0.8,
                  }} />
                )}
                {/* Skutečný sloupec */}
                <div style={{
                  width: '100%', height: actualH,
                  borderRadius: '4px 4px 2px 2px',
                  background: barColor,
                  transition: 'height 400ms ease',
                }} />
              </div>
              <div style={{
                color: isToday ? 'var(--brand-primary)' : 'var(--text-muted)',
                fontSize: 9, fontWeight: isToday ? 800 : 600,
              }}>
                {dayLabel(entry.date)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 8, background: 'rgba(53,64,82,0.9)', borderRadius: 2 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Skutečný příjem</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 2, background: 'var(--brand-primary)', borderRadius: 1 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Cíl</span>
        </div>
      </div>

      {/* Denní compliance bubliny */}
      <div style={{ display: 'flex', gap: 4 }}>
        {entries.map(entry => (
          <div key={entry.date} style={{
            flex: 1, textAlign: 'center',
            background: entry.target_kcal === 0 ? 'var(--border-subtle)' : `${scoreColor(entry.compliance)}22`,
            borderRadius: 8, padding: '6px 2px',
          }}>
            <div style={{ color: entry.target_kcal === 0 ? 'var(--text-muted)' : scoreColor(entry.compliance), fontSize: 11, fontWeight: 800 }}>
              {entry.target_kcal === 0 ? '–' : `${entry.compliance}%`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WeeklyComplianceChart;
