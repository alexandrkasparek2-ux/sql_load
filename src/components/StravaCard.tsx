import { useContext } from 'react';
import { T, Card, Spinner } from './UI';
import { startStravaOAuth, activityKcal, sportIcon, formatDuration } from '../services/stravaService';
import { useStravaData } from '../hooks/useStravaData';
import { AppContext } from '../App';
import { todayLocalISO as getTodayLocalISO } from '../utils/date';

const STRAVA_ORANGE = '#fc4c02';

// ── Today's activities filter ─────────────────────────────────
function todayLocalISO(): string {
  return getTodayLocalISO();
}

function activityDateLocal(a: { start_date_local: string }): string {
  return a.start_date_local.split('T')[0];
}

// ── Connect button ────────────────────────────────────────────
function ConnectButton() {
  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: STRAVA_ORANGE,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 18, filter: 'grayscale(1) brightness(10)' }}>🚴</span>
        </div>
        <div>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: T.text }}>
            Strava
          </div>
          <div style={{ fontSize: 11, color: T.muted }}>Aktivity · Kalorie · Vzdálenost</div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
        Připoj Strava a app automaticky načte dnešní aktivity a ukáže ti kolik kalorií ještě potřebuješ doplnit.
      </div>

      <button
        onClick={() => startStravaOAuth()}
        style={{
          width: '100%', padding: '12px', borderRadius: 12, cursor: 'pointer',
          background: STRAVA_ORANGE + '22', border: `1px solid ${STRAVA_ORANGE}66`,
          color: STRAVA_ORANGE, fontSize: 14, fontWeight: 700,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'Syne,sans-serif',
        }}
      >
        🚴 Připojit Strava
      </button>
    </Card>
  );
}

// ── Activity row ──────────────────────────────────────────────
function ActivityRow({ name, sport_type, elapsed_time, distance, kcal }: {
  name: string; sport_type: string; elapsed_time: number;
  distance: number; kcal: number;
}) {
  const km = distance > 0 ? `${(distance / 1000).toFixed(1)} km` : null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0', borderBottom: `1px solid ${T.border}`,
    }}>
      <span style={{ fontSize: 20, width: 26, textAlign: 'center' }}>{sportIcon(sport_type)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
        <div style={{ fontSize: 11, color: T.muted }}>
          {formatDuration(elapsed_time)}{km ? ` · ${km}` : ''}
        </div>
      </div>
      {kcal > 0 && (
        <div style={{ fontSize: 13, fontWeight: 700, color: STRAVA_ORANGE, flexShrink: 0 }}>
          {kcal.toLocaleString()} kcal
        </div>
      )}
    </div>
  );
}

// ── Remaining macro pill ──────────────────────────────────────
function MacroPill({ label, remaining, unit, color }: {
  label: string; remaining: number; unit: string; color: string;
}) {
  const val = Math.max(0, Math.round(remaining));
  return (
    <div style={{
      flex: 1, background: T.bg, borderRadius: 10, padding: '8px 10px',
      display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'Syne,sans-serif' }}>
        {val}{unit}
      </div>
      <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
    </div>
  );
}

// ── Main StravaCard ───────────────────────────────────────────
export function StravaCard() {
  const { totals, goals } = useContext(AppContext);
  const { activities, loading, error, stale, isConnected, cacheAge, sync, disconnect } = useStravaData(1);

  if (!isConnected) return <ConnectButton />;

  const today        = todayLocalISO();
  const todayActs    = activities.filter(a => activityDateLocal(a) === today);
  const totalKcal    = todayActs.reduce((s, a) => s + activityKcal(a), 0);

  // How much left to eat: base goal + Strava burned - already eaten
  const adjustedGoal = goals.kcal + totalKcal;
  const remaining    = Math.round(adjustedGoal - totals.kcal);

  // Scale remaining macros proportionally from goal ratio
  const scale = remaining > 0 && adjustedGoal > 0 ? remaining / adjustedGoal : 0;
  const remCarbs   = goals.carbs   * scale;
  const remProtein = goals.protein * scale;
  const remFat     = goals.fat     * scale;

  return (
    <Card style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🚴</span>
          <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: T.text }}>
            Strava dnes
          </span>
          {stale && (
            <span style={{ fontSize: 10, color: '#f59e0b', background: '#f59e0b18',
              padding: '2px 6px', borderRadius: 6 }}>offline</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {cacheAge && <span style={{ fontSize: 10, color: T.muted }}>{cacheAge}</span>}
          <button onClick={sync} disabled={loading} style={{
            background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer',
            color: T.muted, padding: 4, display: 'flex', alignItems: 'center',
          }}>
            {loading ? <Spinner color={T.muted} size={14} /> : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {loading && !activities.length ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: T.muted, fontSize: 13 }}>
          <Spinner color={STRAVA_ORANGE} size={22} />
          <div style={{ marginTop: 8 }}>Načítám aktivity ze Stravy…</div>
        </div>
      ) : error && !activities.length ? (
        <div style={{ textAlign: 'center', padding: '14px 0' }}>
          <div style={{ fontSize: 13, color: '#ff375f', marginBottom: 8 }}>{error}</div>
          <button onClick={sync} style={{
            background: '#ff375f18', border: '1px solid #ff375f44', borderRadius: 8,
            color: '#ff375f', padding: '6px 14px', fontSize: 12, cursor: 'pointer',
          }}>Zkusit znovu</button>
        </div>
      ) : (
        <>
          {/* Today's activities */}
          {todayActs.length === 0 ? (
            <div style={{ fontSize: 13, color: T.muted, padding: '6px 0 10px', textAlign: 'center' }}>
              Dnes zatím žádná aktivita
            </div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              {todayActs.map(a => (
                <ActivityRow key={a.id} {...a} kcal={activityKcal(a)} />
              ))}
            </div>
          )}

          {/* Calorie summary */}
          {totalKcal > 0 && (
            <>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: STRAVA_ORANGE + '14', border: `1px solid ${STRAVA_ORANGE}33`,
                borderRadius: 10, padding: '10px 12px', marginBottom: 12,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Spáleno dnes</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: STRAVA_ORANGE,
                    fontFamily: 'Syne,sans-serif' }}>
                    {totalKcal.toLocaleString()} kcal
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Zbývá sníst</div>
                  <div style={{ fontSize: 20, fontWeight: 800,
                    color: remaining > 0 ? '#30d158' : '#ff375f',
                    fontFamily: 'Syne,sans-serif' }}>
                    {remaining > 0 ? remaining.toLocaleString() : 0} kcal
                  </div>
                </div>
              </div>

              {/* Remaining macros */}
              {remaining > 0 && (
                <>
                  <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase',
                    letterSpacing: '0.06em', marginBottom: 6 }}>
                    Zbývá doplnit
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    <MacroPill label="Sacharidy" remaining={remCarbs}   unit="g" color="#3b82f6" />
                    <MacroPill label="Bílkoviny" remaining={remProtein} unit="g" color="#22c55e" />
                    <MacroPill label="Tuky"      remaining={remFat}     unit="g" color="#f59e0b" />
                  </div>
                </>
              )}
            </>
          )}

          {/* Disconnect */}
          <button onClick={disconnect} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.muted, fontSize: 10, width: '100%', padding: '4px 0',
            textDecoration: 'underline',
          }}>
            Odpojit Strava
          </button>
        </>
      )}
    </Card>
  );
}
