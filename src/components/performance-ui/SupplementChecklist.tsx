// ============================================================
// SupplementChecklist.tsx
// Denní checklist suplementů dle tréninkové fáze.
// Ukládá stav zaškrtnutí do Supabase supplement_log tabulky.
// ============================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  getSupplementsForPhase,
  groupSupplementsByTiming,
  TIMING_LABELS,
  type PhaseSupplement,
  type SupplementTiming,
} from '../../services/supplementService';
import type { TrainingPhase } from '../../services/phaseDetectionService';
import { todayLocalISO } from '../../utils/date';

interface Props {
  userId:     string | undefined;
  phase:      TrainingPhase;
  daysToRace: number | null;
}

type TakenMap = Record<string, boolean>; // supplement.id → taken

export function SupplementChecklist({ userId, phase, daysToRace }: Props) {
  const [takenMap, setTakenMap] = useState<TakenMap>({});
  const [loading, setLoading]   = useState(false);

  const supplements = getSupplementsForPhase(phase, daysToRace);
  const today       = todayLocalISO();

  // Načtení z Supabase supplement_log pro dnešek
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from('supplement_log')
      .select('supplement_id, taken_at')
      .eq('user_id', userId)
      .gte('taken_at', `${today}T00:00:00`)
      .lte('taken_at', `${today}T23:59:59`)
      .then(({ data }) => {
        const map: TakenMap = {};
        for (const row of (data ?? [])) {
          if (typeof row.supplement_id === 'string') {
            map[row.supplement_id] = true;
          }
        }
        setTakenMap(map);
        setLoading(false);
      });
  }, [userId, today]);

  async function toggle(sup: PhaseSupplement) {
    if (!userId) return;
    const taken = !takenMap[sup.id];
    setTakenMap(prev => ({ ...prev, [sup.id]: taken }));

    if (taken) {
      await supabase.from('supplement_log').upsert(
        {
          user_id:         userId,
          date:            today,
          supplement_id:   sup.id,
          supplement_name: sup.name,
          dose:            sup.dose,
          unit:            '',
          taken:           true,
          taken_at:        new Date().toISOString(),
        },
        { onConflict: 'user_id,date,supplement_id' },
      );
    } else {
      await supabase
        .from('supplement_log')
        .delete()
        .eq('user_id', userId)
        .eq('date', today)
        .eq('supplement_id', sup.id);
    }
  }

  const grouped   = groupSupplementsByTiming(supplements);
  const timings   = Object.keys(grouped) as SupplementTiming[];
  const takenCount = Object.values(takenMap).filter(Boolean).length;
  const total     = supplements.length;
  const allDone   = total > 0 && takenCount >= total;

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div className="label-caps" style={{ color: 'var(--brand-primary)', marginBottom: 2 }}>
            💊 Suplementy dnes
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
            {takenCount}/{total} splněno · {phase.replace('_', ' ')}
          </div>
        </div>
        {allDone && (
          <span style={{
            background: 'rgba(34,197,94,0.15)', color: '#22c55e',
            borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 800,
          }}>
            ✅ Vše splněno!
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 16 }}>
          Načítám...
        </div>
      ) : supplements.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 16 }}>
          Žádné suplementy pro tuto fázi
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {timings.map(timing => {
            const items = grouped[timing];
            if (!items || items.length === 0) return null;
            return (
              <div key={timing}>
                {/* Timing sekce */}
                <div style={{
                  color: 'var(--text-muted)', fontSize: 9, fontWeight: 700,
                  letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
                }}>
                  {TIMING_LABELS[timing]}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map(sup => {
                    const taken = !!takenMap[sup.id];
                    return (
                      <button
                        key={sup.id}
                        type="button"
                        onClick={() => toggle(sup)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: taken ? 'rgba(34,197,94,0.1)' : 'var(--bg-secondary)',
                          border: `1px solid ${taken ? 'rgba(34,197,94,0.3)' : 'var(--border-subtle)'}`,
                          borderRadius: 12, padding: '10px 12px',
                          cursor: 'pointer', textAlign: 'left', width: '100%',
                          transition: 'all 150ms ease',
                        }}
                      >
                        {/* Ikona suplementu */}
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: `${sup.color}22`, border: `1px solid ${sup.color}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18,
                        }}>
                          {sup.icon}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{
                            color: taken ? 'var(--text-muted)' : 'var(--text-primary)',
                            fontSize: 13, fontWeight: 700,
                            textDecoration: taken ? 'line-through' : 'none',
                          }}>
                            {sup.name}
                          </div>
                          <div style={{ color: sup.color, fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                            {sup.dose} · {sup.timingLabel}
                          </div>
                          <div style={{ color: 'var(--text-tertiary)', fontSize: 10, marginTop: 1 }}>
                            {sup.note}
                          </div>
                        </div>

                        {/* Zaškrtávací indikátor */}
                        <div style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                          background: taken ? '#22c55e' : 'var(--bg-card)',
                          border: `2px solid ${taken ? '#22c55e' : 'var(--border-accent)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 150ms ease',
                        }}>
                          {taken && <span style={{ color: '#fff', fontSize: 13 }}>✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Varování: kreatin stopnut před závodem */}
      {daysToRace != null && daysToRace <= 5 && daysToRace > 0 &&
        !supplements.some(s => s.id === 'kreatin') && (
        <div style={{
          marginTop: 12, background: 'rgba(245,158,11,0.1)', borderRadius: 10,
          padding: '8px 12px', color: '#f59e0b', fontSize: 12,
        }}>
          ⚠️ Kreatin zastaven {5 - daysToRace + 1} den před závodem (prevence zadržování vody).
        </div>
      )}
    </div>
  );
}

export default SupplementChecklist;
