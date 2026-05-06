import { todayLocalISO } from '../../utils/date';

interface Props {
  days: { date: string; intake: number; target: number }[];
  height?: number;
}

export function WeekChart({ days, height = 120 }: Props) {
  const max = Math.max(...days.map(day => Math.max(day.intake, day.target)), 1);
  const today = todayLocalISO();

  return (
    <div style={{ display: 'flex', alignItems: 'end', gap: 8, height, paddingTop: 12 }}>
      {days.map(day => {
        const barHeight = Math.max(4, (day.intake / max) * (height - 30));
        const targetOffset = height - 30 - (day.target / max) * (height - 30);
        const isToday = day.date === today;
        return (
          <div key={day.date} style={{ flex: 1, minWidth: 22, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'end', alignItems: 'center', gap: 6 }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 24, height: height - 30, display: 'flex', alignItems: 'end' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: targetOffset, height: 2, background: 'var(--brand-primary)', borderRadius: 2, opacity: 0.75 }} />
              <div style={{ width: '100%', height: barHeight, borderRadius: '6px 6px 2px 2px', background: isToday ? 'var(--brand-gradient)' : 'linear-gradient(180deg, #354052, #252c37)' }} />
            </div>
            <div style={{ color: isToday ? 'var(--brand-primary)' : 'var(--text-muted)', fontSize: 9, fontWeight: isToday ? 800 : 600 }}>
              {new Date(`${day.date}T00:00:00`).toLocaleDateString('cs-CZ', { weekday: 'short' })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default WeekChart;
