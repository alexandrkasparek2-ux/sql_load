import { T, Card, Spinner } from './UI';
import { isIOS } from '../services/appleHealthService';
import { useAppleHealth } from '../hooks/useAppleHealth';

// ── Activity ring (Activity Monitor style) ────────────────────
function ActivityRing({
  value, max, color, size = 56, strokeWidth = 7,
}: {
  value: number | null; max: number; color: string;
  size?: number; strokeWidth?: number;
}) {
  const r    = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = value != null ? Math.min(1, value / max) : 0;
  const dash = pct * circ;
  const cx   = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color + '26'}
        strokeWidth={strokeWidth} />
      {/* Fill */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ / 4}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ── Nested 3-ring view (Apple Activity style) ─────────────────
function ActivityRings({
  activeKcal, kcalGoal,
  exerciseMins, exerciseGoal,
  standHours,
}: {
  activeKcal: number | null; kcalGoal: number | null;
  exerciseMins: number | null; exerciseGoal: number | null;
  standHours: number | null;
}) {
  const MOVE_COLOR     = '#ff375f'; // red
  const EXERCISE_COLOR = '#30d158'; // green
  const STAND_COLOR    = '#0affef'; // cyan

  const moveMax     = kcalGoal    ?? 500;
  const exerciseMax = exerciseGoal ?? 30;
  const standMax    = 12;

  const ringConfigs = [
    { value: activeKcal,  max: moveMax,     color: MOVE_COLOR     },
    { value: exerciseMins, max: exerciseMax, color: EXERCISE_COLOR },
    { value: standHours,  max: standMax,    color: STAND_COLOR    },
  ];

  return (
    <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
      {ringConfigs.map((cfg, i) => {
        const size = 96 - i * 26;
        return (
          <div key={i} style={{
            position: 'absolute',
            top: (96 - size) / 2,
            left: (96 - size) / 2,
          }}>
            <ActivityRing {...cfg} size={size} strokeWidth={8} />
          </div>
        );
      })}
    </div>
  );
}

// ── Stat row ──────────────────────────────────────────────────
function StatRow({ color, icon, label, value, goal }: {
  color: string; icon: string; label: string;
  value: string; goal?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: color,
        boxShadow: `0 0 5px ${color}`, flexShrink: 0,
      }} />
      <span style={{ fontSize: 12, color: T.muted, flex: 1 }}>{icon} {label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
        {value}
        {goal && <span style={{ fontWeight: 400, color: T.muted, fontSize: 11 }}> / {goal}</span>}
      </span>
    </div>
  );
}

// ── Not available notice ──────────────────────────────────────
function NotAvailableNotice() {
  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #ff375f, #ff9f0a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 20 }}>❤️</span>
        </div>
        <div>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: T.text }}>
            Apple Health
          </div>
          <div style={{ fontSize: 11, color: T.muted }}>Aktivita · Spánek · TF</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
        {isIOS()
          ? 'Přidej aplikaci na plochu iPhone (Sdílet → Přidat na plochu) pro přístup k Apple Health.'
          : 'Apple Health je dostupný pouze v Safari na iPhone (iOS 17.4+) při přidání na plochu.'}
      </div>
    </Card>
  );
}

// ── Connect button ────────────────────────────────────────────
function ConnectButton({ onConnect, loading }: { onConnect: () => void; loading: boolean }) {
  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #ff375f, #ff9f0a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 20 }}>❤️</span>
        </div>
        <div>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: T.text }}>
            Apple Health
          </div>
          <div style={{ fontSize: 11, color: T.muted }}>Aktivita · Spánek · Klidová TF</div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
        Připoj Apple Health a sleduj denní aktivitu, pohybové kruhy, spánek a klidovou tepovou frekvenci přímo v CycloFuel.
      </div>

      <button
        onClick={onConnect}
        disabled={loading}
        style={{
          width: '100%', padding: '12px', borderRadius: 12, cursor: 'pointer',
          background: 'linear-gradient(135deg, #ff375f22, #ff9f0a22)',
          border: '1px solid #ff375f55',
          color: '#ff375f', fontSize: 14, fontWeight: 700,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'Syne,sans-serif',
        }}
      >
        {loading
          ? <><Spinner color="#ff375f" size={16} /> Připojuji…</>
          : '❤️ Připojit Apple Health'}
      </button>
    </Card>
  );
}

// ── Main AppleHealthCard ──────────────────────────────────────
export function AppleHealthCard() {
  const { data, loading, error, stale, isAvailable, isAuthorized,
          cacheAge, authorize, sync, disconnect } = useAppleHealth();

  if (!isAvailable) return <NotAvailableNotice />;
  if (!isAuthorized) return <ConnectButton onConnect={authorize} loading={loading} />;

  const MOVE_COLOR     = '#ff375f';
  const EXERCISE_COLOR = '#30d158';
  const STAND_COLOR    = '#0affef';

  return (
    <Card style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>❤️</span>
          <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: T.text }}>
            Apple Health
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

      {loading && !data ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: T.muted, fontSize: 13 }}>
          <Spinner color="#ff375f" size={24} />
          <div style={{ marginTop: 8 }}>Načítám Apple Health data…</div>
        </div>
      ) : error && !data ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 13, color: '#ff375f', marginBottom: 8 }}>{error}</div>
          <button onClick={sync} style={{
            background: '#ff375f18', border: '1px solid #ff375f44', borderRadius: 8,
            color: '#ff375f', padding: '6px 14px', fontSize: 12, cursor: 'pointer',
          }}>Zkusit znovu</button>
        </div>
      ) : (
        <>
          {/* Activity rings + stats */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14 }}>
            <ActivityRings
              activeKcal={data?.activeKcal ?? null}
              kcalGoal={data?.kcalGoal ?? null}
              exerciseMins={data?.exerciseMins ?? null}
              exerciseGoal={data?.exerciseGoal ?? null}
              standHours={data?.standHours ?? null}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <StatRow
                color={MOVE_COLOR} icon="🔥" label="Pohyb"
                value={data?.activeKcal != null ? `${Math.round(data.activeKcal)} kcal` : '—'}
                goal={data?.kcalGoal != null ? `${Math.round(data.kcalGoal)} kcal` : undefined}
              />
              <StatRow
                color={EXERCISE_COLOR} icon="⚡" label="Cvičení"
                value={data?.exerciseMins != null ? `${Math.round(data.exerciseMins)} min` : '—'}
                goal={data?.exerciseGoal != null ? `${Math.round(data.exerciseGoal)} min` : undefined}
              />
              <StatRow
                color={STAND_COLOR} icon="🧍" label="Stání"
                value={data?.standHours != null ? `${data.standHours} h` : '—'}
                goal="12 h"
              />
            </div>
          </div>

          {/* Sleep & RHR row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{
              flex: 1, background: T.bg, borderRadius: 12, padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: 3,
            }}>
              <div style={{ fontSize: 14 }}>😴</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'Syne,sans-serif' }}>
                {data?.sleepHours != null ? `${data.sleepHours} h` : '—'}
              </div>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Spánek
              </div>
            </div>
            <div style={{
              flex: 1, background: T.bg, borderRadius: 12, padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: 3,
            }}>
              <div style={{ fontSize: 14 }}>❤️</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'Syne,sans-serif' }}>
                {data?.restingHR != null ? `${Math.round(data.restingHR)} bpm` : '—'}
              </div>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Klidová TF
              </div>
            </div>
          </div>

          {/* Disconnect */}
          <button onClick={disconnect} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.muted, fontSize: 10, width: '100%', padding: '4px 0',
            textDecoration: 'underline',
          }}>
            Odpojit Apple Health
          </button>
        </>
      )}
    </Card>
  );
}
