// ============================================================
// OnBikeNutritionTimer.tsx
// On-bike výživový timer — odpočítávání do dalšího jídla (každých 45 min),
// counter sacharidů na kole vs. cíl (60–80 g/h) a log konzumace.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import type { OnBikeEntry } from '../../hooks/useRaceWeek';
import { notifyRaceOnBikeFuel } from '../../services/notificationService';

interface Props {
  raceStartHour:   number;
  raceStartMinute: number;
  entries:         OnBikeEntry[];
  totalCarbs:      number;
  raceEventId:     string | null;
  onAddEntry:      (entry: Omit<OnBikeEntry, 'id' | 'user_id'>) => Promise<void>;
}

const INTERVAL_MIN = 45;
const TARGET_CARBS_PER_HOUR_MIN = 60;
const TARGET_CARBS_PER_HOUR_MAX = 80;

function pad(n: number): string { return String(n).padStart(2, '0'); }

// Rychlé položky pro přidání
const QUICK_ITEMS = [
  { name: 'Energetický gel', carbs: 25, kcal: 100 },
  { name: 'Banán', carbs: 24, kcal: 90 },
  { name: 'Rice cake', carbs: 40, kcal: 165 },
  { name: 'Energetická tyčinka', carbs: 40, kcal: 200 },
  { name: 'Izotonický nápoj 500ml', carbs: 35, kcal: 140 },
  { name: 'Datle (5 ks)', carbs: 30, kcal: 120 },
];

export function OnBikeNutritionTimer({
  raceStartHour, raceStartMinute, entries, totalCarbs, raceEventId, onAddEntry,
}: Props) {
  const [nextFeedMin, setNextFeedMin] = useState<number | null>(null);
  const [elapsedH, setElapsedH]       = useState(0);
  const [adding, setAdding]           = useState(false);
  const [customName, setCustomName]   = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customKcal, setCustomKcal]   = useState('');

  const updateTimer = useCallback(() => {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), raceStartHour, raceStartMinute);
    const elapsedMs = now.getTime() - start.getTime();

    if (elapsedMs < 0) {
      setNextFeedMin(null);
      setElapsedH(0);
      return;
    }

    setElapsedH(elapsedMs / 3600000);
    const elapsedMin  = elapsedMs / 60000;
    const nextMin     = INTERVAL_MIN - (elapsedMin % INTERVAL_MIN);
    setNextFeedMin(Math.ceil(nextMin));

    // Notifikace když zbývá méně než 1 minuta
    if (nextMin <= 1) {
      notifyRaceOnBikeFuel();
    }
  }, [raceStartHour, raceStartMinute]);

  useEffect(() => {
    updateTimer();
    const id = setInterval(updateTimer, 10000); // update každých 10s
    return () => clearInterval(id);
  }, [updateTimer]);

  const targetCarbsTotal = elapsedH > 0
    ? ((TARGET_CARBS_PER_HOUR_MIN + TARGET_CARBS_PER_HOUR_MAX) / 2) * elapsedH
    : 0;
  const carbsPercent = targetCarbsTotal > 0
    ? Math.min((totalCarbs / targetCarbsTotal) * 100, 130)
    : 0;
  const carbsOk = carbsPercent >= 80;

  async function addQuick(item: typeof QUICK_ITEMS[0]) {
    await onAddEntry({
      race_event_id: raceEventId,
      timestamp:     new Date().toISOString(),
      item_name:     item.name,
      carbs_g:       item.carbs,
      kcal:          item.kcal,
      notes:         '',
    });
  }

  async function addCustom() {
    if (!customName || !customCarbs) return;
    await onAddEntry({
      race_event_id: raceEventId,
      timestamp:     new Date().toISOString(),
      item_name:     customName,
      carbs_g:       Number(customCarbs),
      kcal:          Number(customKcal) || Math.round(Number(customCarbs) * 4),
      notes:         '',
    });
    setCustomName(''); setCustomCarbs(''); setCustomKcal('');
    setAdding(false);
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(76,175,80,0.4)', borderRadius: 18, padding: 18 }}>
      <div className="label-caps" style={{ color: '#4CAF50', marginBottom: 14 }}>
        🚴 On-Bike výživa
      </div>

      {/* Timer do dalšího jídla */}
      {nextFeedMin !== null ? (
        <div style={{
          background: nextFeedMin <= 5 ? 'rgba(239,68,68,0.15)' : 'rgba(76,175,80,0.1)',
          border: `1px solid ${nextFeedMin <= 5 ? 'rgba(239,68,68,0.4)' : 'rgba(76,175,80,0.3)'}`,
          borderRadius: 14, padding: '14px 16px', marginBottom: 14, textAlign: 'center',
        }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
            Další jídlo za
          </div>
          <div style={{
            color: nextFeedMin <= 5 ? '#ef4444' : '#4CAF50',
            fontSize: 36, fontWeight: 900, lineHeight: 1, fontFamily: 'monospace',
          }}>
            {pad(nextFeedMin)} min
          </div>
          {nextFeedMin <= 5 && (
            <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 700, marginTop: 4 }}>
              🍌 Sněz něco! Gel nebo rice cake.
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: 12, padding: 12,
          marginBottom: 14, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12,
        }}>
          Čeká na start závodu
        </div>
      )}

      {/* Celkové sacharidy vs cíl */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
            Sacharidy na kole
          </span>
          <span style={{ color: carbsOk ? '#22c55e' : '#ef4444', fontSize: 12, fontWeight: 800 }}>
            {Math.round(totalCarbs)} g / {Math.round(targetCarbsTotal)} g cíl
          </span>
        </div>
        <div style={{ height: 8, background: 'var(--border-subtle)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${carbsPercent}%`,
            background: carbsOk ? '#22c55e' : '#ef4444',
            borderRadius: 4, transition: 'width 400ms ease',
          }} />
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 4 }}>
          Cíl: {TARGET_CARBS_PER_HOUR_MIN}–{TARGET_CARBS_PER_HOUR_MAX} g sacharidů/h
          {elapsedH > 0 && ` · ${elapsedH.toFixed(1)} h v sedle`}
        </div>
      </div>

      {/* Rychlé přidání */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Rychlé přidání
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {QUICK_ITEMS.map(item => (
            <button
              key={item.name}
              type="button"
              onClick={() => addQuick(item)}
              style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border-accent)',
                borderRadius: 20, padding: '5px 12px', cursor: 'pointer',
                color: 'var(--text-primary)', fontSize: 11, fontWeight: 700,
              }}
            >
              {item.name} <span style={{ color: '#f59e0b' }}>({item.carbs}g S)</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAdding(v => !v)}
            style={{
              background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.4)',
              borderRadius: 20, padding: '5px 12px', cursor: 'pointer',
              color: '#4CAF50', fontSize: 11, fontWeight: 800,
            }}
          >
            + Vlastní
          </button>
        </div>
      </div>

      {/* Vlastní přidání */}
      {adding && (
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: 12, padding: 12, marginBottom: 12,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <input
            placeholder="Název položky"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
              borderRadius: 8, padding: '7px 10px', color: 'var(--text-primary)',
              fontSize: 13, width: '100%', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Sacharidy (g)"
              type="number"
              value={customCarbs}
              onChange={e => setCustomCarbs(e.target.value)}
              style={{
                flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
                borderRadius: 8, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13,
              }}
            />
            <input
              placeholder="kcal (volitelné)"
              type="number"
              value={customKcal}
              onChange={e => setCustomKcal(e.target.value)}
              style={{
                flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
                borderRadius: 8, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13,
              }}
            />
          </div>
          <button
            type="button"
            onClick={addCustom}
            style={{
              background: '#4CAF50', border: 'none', borderRadius: 8, padding: '8px',
              color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
            }}
          >
            Přidat
          </button>
        </div>
      )}

      {/* Log položek */}
      {entries.length > 0 && (
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            Log na kole ({entries.length} položek)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
            {entries.map((e, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--bg-secondary)', borderRadius: 8, padding: '7px 10px',
              }}>
                <div>
                  <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 700 }}>{e.item_name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>
                    {new Date(e.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 800 }}>{e.carbs_g} g S</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default OnBikeNutritionTimer;
