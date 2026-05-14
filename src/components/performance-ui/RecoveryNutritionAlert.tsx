// ============================================================
// RecoveryNutritionAlert.tsx
// Alert regenerace na základě Whoop dat —
// nízká recovery: zvýšit protein o 10 %
// nízké HRV: zkontroluj příjem posledních 3 dní
// ============================================================

interface WhoopRecovery {
  recovery_score: number; // 0–100 %
  hrv:            number; // ms
  rhr:            number; // bpm
}

interface Props {
  recovery:          WhoopRecovery | null;
  hrvBaseline:       number | null; // průměrná baseline HRV uživatele
  currentProteinG:   number;        // dnešní příjem bílkovin
  targetProteinG:    number;        // doporučený cíl bílkovin
  onAdjustProtein?:  (newTargetG: number) => void;
}

function recoveryLevel(score: number): 'red' | 'yellow' | 'green' {
  if (score < 34) return 'red';
  if (score < 67) return 'yellow';
  return 'green';
}

export function RecoveryNutritionAlert({
  recovery, hrvBaseline, currentProteinG, targetProteinG, onAdjustProtein,
}: Props) {
  if (!recovery) return null;

  const level     = recoveryLevel(recovery.recovery_score);
  const lowHRV    = hrvBaseline != null && recovery.hrv < hrvBaseline * 0.7;
  const lowRecov  = level === 'red';
  const showAlert = lowRecov || lowHRV;

  if (!showAlert) return null;

  const adjustedProtein = Math.round(targetProteinG * 1.1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Nízká regenerace */}
      {lowRecov && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 14, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>🔴</span>
            <div>
              <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 800 }}>
                Nízká regenerace — {recovery.recovery_score} %
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 2 }}>
                Prioritizuj protein a spánek dnes
              </div>
            </div>
          </div>

          {/* Akce */}
          <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
            <div style={{
              background: 'var(--bg-secondary)', borderRadius: 10, padding: '10px 12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Doporučený protein dnes
                </div>
                <div style={{ color: '#ef4444', fontSize: 18, fontWeight: 900 }}>
                  {adjustedProtein} g
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginLeft: 6 }}>
                    (+10 % z {targetProteinG} g)
                  </span>
                </div>
              </div>
              {onAdjustProtein && (
                <button
                  type="button"
                  onClick={() => onAdjustProtein(adjustedProtein)}
                  style={{
                    background: '#ef4444', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Nastavit
                </button>
              )}
            </div>

            {/* Aktuální vs. cíl */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              color: 'var(--text-secondary)', fontSize: 12, padding: '4px 2px',
            }}>
              <span>Přijato dnes: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(currentProteinG)} g</strong></span>
              <span>Chybí: <strong style={{ color: '#ef4444' }}>{Math.max(0, Math.round(adjustedProtein - currentProteinG))} g</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Nízké HRV */}
      {lowHRV && (
        <div style={{
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 14, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>📊</span>
            <div>
              <div style={{ color: '#f59e0b', fontSize: 14, fontWeight: 800 }}>
                HRV pod baseline — {Math.round(recovery.hrv)} ms
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
                HRV je o {Math.round((1 - recovery.hrv / (hrvBaseline ?? 1)) * 100)} % pod tvojí
                průměrnou hodnotou ({Math.round(hrvBaseline ?? 0)} ms).
                Zkontroluj příjem posledních 3 dní — podcenění výživy může HRV snižovat.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecoveryNutritionAlert;
