// ============================================================
// PhaseIndicator.tsx
// Hlavní indikátor tréninkové fáze — zobrazuje aktuální fázi,
// počet dní do závodu / po závodě a stručný tip pro den.
// ============================================================

import type { PhaseInfo } from '../../services/phaseDetectionService';

interface Props {
  phaseInfo: PhaseInfo;
  raceName?: string;
  compact?:  boolean;
}

export function PhaseIndicator({ phaseInfo, raceName, compact = false }: Props) {
  const { phase, label, color, icon, daysToRace, daysSinceRace, tip } = phaseInfo;

  function daysLabel(): string {
    if (phase === 'race_day') return 'Dnes závodíš!';
    if (phase === 'post_race' && daysSinceRace != null) {
      return `${daysSinceRace} ${daysSinceRace === 1 ? 'den' : daysSinceRace < 5 ? 'dny' : 'dní'} po závodě`;
    }
    if (daysToRace != null && daysToRace > 0) {
      return `${daysToRace} ${daysToRace === 1 ? 'den' : daysToRace < 5 ? 'dny' : 'dní'} do závodu`;
    }
    return 'Žádný závod naplánován';
  }

  if (compact) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: `${color}22`, border: `1px solid ${color}66`,
        borderRadius: 20, padding: '5px 12px',
      }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ color, fontSize: 12, fontWeight: 800 }}>{label}</span>
        {daysToRace != null && (
          <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{daysLabel()}</span>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${color}55`,
      borderRadius: 18,
      padding: '18px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Barevný akcent vlevo */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: color, borderRadius: '4px 0 0 4px',
      }} />

      <div style={{ paddingLeft: 8 }}>
        {/* Fáze badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{
            fontSize: 28,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}>{icon}</span>
          <div>
            <div className="label-caps" style={{ color, fontSize: 10, marginBottom: 2 }}>
              Tréninkový cyklus
            </div>
            <div style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
              {label}
            </div>
          </div>
        </div>

        {/* Závod a počítadlo dní */}
        {(daysToRace != null || daysSinceRace != null) && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg-secondary)', borderRadius: 10, padding: '10px 12px',
            marginBottom: 10,
          }}>
            <div>
              {raceName && (
                <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700,
                  letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
                  {phase === 'post_race' ? 'Proběhlý závod' : 'Příští závod'}
                </div>
              )}
              <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}>
                {raceName ?? daysLabel()}
              </div>
              {raceName && (
                <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 2 }}>
                  {daysLabel()}
                </div>
              )}
            </div>
            {/* Velké číslo dní */}
            {phase !== 'race_day' && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ color, fontSize: 32, fontWeight: 900, lineHeight: 1 }}>
                  {phase === 'post_race' ? daysSinceRace : daysToRace}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>dní</div>
              </div>
            )}
          </div>
        )}

        {/* Denní tip */}
        <div style={{
          color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5,
          borderTop: '1px solid var(--border-subtle)', paddingTop: 10,
        }}>
          💡 {tip}
        </div>
      </div>
    </div>
  );
}

export default PhaseIndicator;
