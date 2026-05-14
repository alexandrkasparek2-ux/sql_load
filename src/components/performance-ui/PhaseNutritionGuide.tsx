// ============================================================
// PhaseNutritionGuide.tsx
// Průvodce výživou pro aktuální fázi — co jíst, čemu se vyhnout,
// timing jídel a hydratační cíl.
// ============================================================

import { useState } from 'react';
import type { DailyNutritionTarget } from '../../services/nutritionTargetService';
import type { PhaseInfo } from '../../services/phaseDetectionService';

interface Props {
  target:    DailyNutritionTarget;
  phaseInfo: PhaseInfo;
}

type Tab = 'jidla' | 'timing' | 'suplementy';

const TAB_LABELS: Record<Tab, string> = {
  jidla:      '🥗 Jídla',
  timing:     '⏰ Timing',
  suplementy: '💊 Suplementy',
};

// Timing jídel dle fáze
function getTimingForPhase(target: DailyNutritionTarget): { time: string; label: string; detail: string }[] {
  const base = [
    { time: '07:00', label: 'Snídaně',            detail: 'Ovesné vločky, vejce, ovoce' },
    { time: '10:00', label: 'Dopolední svačina',  detail: 'Tvaroh nebo jogurt s ovocem' },
    { time: '13:00', label: 'Oběd',               detail: 'Sacharidy + protein + zelenina' },
    { time: '16:00', label: 'Odpolední svačina',  detail: 'Banán, ořechy nebo protein bar' },
    { time: '19:00', label: 'Večeře',             detail: 'Lehčí porce, protein + zelenina' },
  ];

  if (target.pre_workout_carbs) {
    base.push({
      time: '15:00', label: 'Před tréninkem',
      detail: `${target.pre_workout_carbs} g sacharidů (~2h před)`,
    });
  }
  if (target.intra_workout_carbs) {
    base.push({
      time: 'Trénink', label: 'Během tréninku',
      detail: `${target.intra_workout_carbs} g sacharidů/h (>90 min)`,
    });
  }
  if (target.post_workout_protein) {
    base.push({
      time: 'Po tréninku', label: 'Do 30 min po tréninku',
      detail: `${target.post_workout_protein} g bílkovin + ${target.post_workout_carbs ?? 0} g sacharidů`,
    });
  }

  // Carb-loading specifika
  if (target.notes.some(n => n.includes('CARB-LOADING'))) {
    return [
      { time: '07:00', label: 'Snídaně',     detail: 'Ovesná kaše s medem + bílé pečivo' },
      { time: '10:00', label: 'Svačina',     detail: 'Banán + rýžový chlebíček' },
      { time: '12:00', label: 'Oběd',        detail: 'Velká porce těstovin nebo rýže' },
      { time: '15:00', label: 'Svačina',     detail: 'Banán + med + izotonický nápoj' },
      { time: '19:00', label: 'Pasta večeře', detail: 'Max porce těstovin — DOKUD DO 19:00!' },
      { time: '20:00', label: 'Pouze tvaroh + med', detail: 'Nic jiného po 20:00' },
    ];
  }

  return base.sort((a, b) => a.time.localeCompare(b.time));
}

export function PhaseNutritionGuide({ target, phaseInfo }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('jidla');
  const timing = getTimingForPhase(target);

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 18, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px 0', background: 'var(--bg-card)' }}>
        <div className="label-caps" style={{ color: phaseInfo.color, marginBottom: 6 }}>
          Průvodce výživou — {phaseInfo.label}
        </div>
        {/* Záložky */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
          {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '8px 4px', border: 'none', borderRadius: '8px 8px 0 0',
                background: activeTab === tab ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 11, fontWeight: activeTab === tab ? 800 : 600,
                cursor: 'pointer', transition: 'all 150ms ease',
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Obsah záložek */}
      <div style={{ padding: 16, background: 'var(--bg-secondary)', minHeight: 180 }}>
        {activeTab === 'jidla' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Doporučená jídla */}
            {target.recommended_foods.length > 0 && (
              <div>
                <div style={{ color: '#22c55e', fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
                  ✅ Doporučená jídla
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {target.recommended_foods.map(food => (
                    <span key={food} style={{
                      background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                      borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700,
                    }}>
                      {food}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Zakázaná jídla */}
            {target.forbidden_foods.length > 0 && (
              <div>
                <div style={{ color: '#ef4444', fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
                  ❌ Vyhni se
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {target.forbidden_foods.map(food => (
                    <span key={food} style={{
                      background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                      borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700,
                    }}>
                      {food}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Poznámky */}
            {target.notes.map((note, i) => (
              <div key={i} style={{
                background: `${phaseInfo.color}15`, borderRadius: 8,
                padding: '8px 12px', color: phaseInfo.color, fontSize: 12,
              }}>
                {note}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'timing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {timing.map((item, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '8px 0',
                borderBottom: i < timing.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}>
                <div style={{
                  color: phaseInfo.color, fontSize: 11, fontWeight: 800, minWidth: 68,
                  paddingTop: 2,
                }}>
                  {item.time}
                </div>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}>
                    {item.label}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 2 }}>
                    {item.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'suplementy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {target.supplements.map((sup, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-card)', borderRadius: 10, padding: '10px 12px',
              }}>
                <span style={{ fontSize: 18 }}>💊</span>
                <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{sup}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hydratace footer */}
      <div style={{
        padding: '10px 18px', borderTop: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg-card)',
      }}>
        <span>💧</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
          Hydratace: min. <strong style={{ color: 'var(--text-primary)' }}>{target.water_glasses}</strong> sklenic vody dnes
        </span>
      </div>
    </div>
  );
}

export default PhaseNutritionGuide;
