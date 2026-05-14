// ============================================================
// RaceMorningProtocol.tsx
// Závodní ráno protokol — checklist s odpočítávačem od startu.
// Zobrazuje se pouze v race_day fázi.
// ============================================================

import { useState, useEffect } from 'react';
import type { RaceMorningItem } from '../../hooks/useRaceWeek';

interface Props {
  items:           RaceMorningItem[];
  raceStartHour:   number;
  raceStartMinute: number;
  onToggle:        (id: string) => void;
  onSetStartTime:  (hour: number, minute: number) => void;
}

function pad(n: number): string { return String(n).padStart(2, '0'); }

function CountdownBadge({ raceStartHour, raceStartMinute }: { raceStartHour: number; raceStartMinute: number }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    function update() {
      const now   = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), raceStartHour, raceStartMinute);
      const diffMs = start.getTime() - now.getTime();
      if (diffMs <= 0) {
        setRemaining('🏁 START!');
        return;
      }
      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      const s = Math.floor((diffMs % 60000) / 1000);
      setRemaining(`${pad(h)}:${pad(m)}:${pad(s)}`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [raceStartHour, raceStartMinute]);

  return (
    <div style={{
      background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.4)',
      borderRadius: 12, padding: '10px 16px', textAlign: 'center',
      marginBottom: 16,
    }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
        Odpočítávání do startu
      </div>
      <div style={{ color: '#4CAF50', fontSize: 28, fontWeight: 900, fontFamily: 'monospace', letterSpacing: 2 }}>
        {remaining}
      </div>
    </div>
  );
}

export function RaceMorningProtocol({
  items, raceStartHour, raceStartMinute, onToggle, onSetStartTime,
}: Props) {
  const [editingTime, setEditingTime] = useState(false);
  const [tempH, setTempH] = useState(raceStartHour);
  const [tempM, setTempM] = useState(raceStartMinute);

  const completedCount = items.filter(i => i.checked).length;
  const allDone = completedCount === items.length;

  function saveTime() {
    onSetStartTime(tempH, tempM);
    setEditingTime(false);
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(76,175,80,0.4)', borderRadius: 18, padding: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div className="label-caps" style={{ color: '#4CAF50', marginBottom: 2 }}>
            🏁 Race Day Protokol
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
            {completedCount}/{items.length} splněno
          </div>
        </div>
        {/* Čas startu */}
        <button
          type="button"
          onClick={() => setEditingTime(v => !v)}
          style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-accent)',
            borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
            color: 'var(--text-primary)', fontSize: 13, fontWeight: 800,
          }}
        >
          Start: {pad(raceStartHour)}:{pad(raceStartMinute)}
        </button>
      </div>

      {/* Úprava startu */}
      {editingTime && (
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: 12, padding: 12,
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Čas startu:</span>
          <input
            type="number" min={0} max={23} value={tempH}
            onChange={e => setTempH(Number(e.target.value))}
            style={{
              width: 48, background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
              borderRadius: 6, padding: '4px 6px', color: 'var(--text-primary)',
              fontSize: 14, fontWeight: 800, textAlign: 'center',
            }}
          />
          <span style={{ color: 'var(--text-muted)' }}>:</span>
          <input
            type="number" min={0} max={59} value={tempM}
            onChange={e => setTempM(Number(e.target.value))}
            style={{
              width: 48, background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
              borderRadius: 6, padding: '4px 6px', color: 'var(--text-primary)',
              fontSize: 14, fontWeight: 800, textAlign: 'center',
            }}
          />
          <button
            type="button" onClick={saveTime}
            style={{
              background: '#4CAF50', border: 'none', borderRadius: 8,
              padding: '5px 12px', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
            }}
          >
            Uložit
          </button>
        </div>
      )}

      {/* Odpočítávač */}
      <CountdownBadge raceStartHour={raceStartHour} raceStartMinute={raceStartMinute} />

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
              background: item.checked ? 'rgba(76,175,80,0.12)' : 'var(--bg-secondary)',
              border: `1px solid ${item.checked ? 'rgba(76,175,80,0.4)' : 'var(--border-subtle)'}`,
              borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'all 200ms ease',
            }}
          >
            {/* Checkbox */}
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
              background: item.checked ? '#4CAF50' : 'var(--bg-card)',
              border: `2px solid ${item.checked ? '#4CAF50' : 'var(--border-accent)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms ease',
            }}>
              {item.checked && <span style={{ color: '#fff', fontSize: 13 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                color: item.checked ? 'var(--text-muted)' : 'var(--text-primary)',
                fontSize: 13, fontWeight: 700,
                textDecoration: item.checked ? 'line-through' : 'none',
              }}>
                {item.label}
              </div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 2 }}>
                {item.detail}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Hotovo banner */}
      {allDone && (
        <div style={{
          marginTop: 14, background: 'rgba(76,175,80,0.15)',
          borderRadius: 10, padding: '10px 14px', textAlign: 'center',
          color: '#4CAF50', fontSize: 14, fontWeight: 800,
        }}>
          🏆 Perfektní příprava! Nyní zaměř se na závod.
        </div>
      )}
    </div>
  );
}

export default RaceMorningProtocol;
