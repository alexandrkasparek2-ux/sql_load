import { T, Card, SectionTitle, Spinner } from '../components/UI';
import {
  startStravaOAuth,
  activityKcal, sportIcon, formatDuration,
  type StravaActivity,
} from '../services/stravaService';
import { useStravaData } from '../hooks/useStravaData';

const STRAVA_ORANGE = '#fc4c02';

// ── Date helpers ──────────────────────────────────────────────
function activityDateLocal(a: StravaActivity): string {
  return a.start_date_local.split('T')[0];
}

function formatDateLabel(iso: string): string {
  const today = new Date().toISOString().split('T')[0];
  const yest  = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
  if (iso === today) return 'Dnes';
  if (iso === yest)  return 'Včera';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric' });
}

// ── Summary bar for a day ─────────────────────────────────────
function DaySummary({ activities }: { activities: StravaActivity[] }) {
  const totalKcal = activities.reduce((s, a) => s + activityKcal(a), 0);
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0);
  const totalDist = activities.reduce((s, a) => s + a.distance, 0);
  const avgHR     = (() => {
    const withHR = activities.filter(a => a.average_heartrate);
    if (!withHR.length) return null;
    return Math.round(withHR.reduce((s, a) => s + (a.average_heartrate ?? 0), 0) / withHR.length);
  })();

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
      {totalKcal > 0 && (
        <div style={{ flex: 1, background: T.bg, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: STRAVA_ORANGE,
            fontFamily: 'Syne,sans-serif' }}>{totalKcal.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>kcal</div>
        </div>
      )}
      {totalTime > 0 && (
        <div style={{ flex: 1, background: T.bg, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text,
            fontFamily: 'Syne,sans-serif' }}>{formatDuration(totalTime)}</div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>čas</div>
        </div>
      )}
      {totalDist > 500 && (
        <div style={{ flex: 1, background: T.bg, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text,
            fontFamily: 'Syne,sans-serif' }}>{(totalDist / 1000).toFixed(1)}</div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>km</div>
        </div>
      )}
      {avgHR && (
        <div style={{ flex: 1, background: T.bg, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#ff375f',
            fontFamily: 'Syne,sans-serif' }}>{avgHR}</div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>TF avg</div>
        </div>
      )}
    </div>
  );
}

// ── Single activity card ──────────────────────────────────────
function ActivityCard({ a }: { a: StravaActivity }) {
  const kcal = activityKcal(a);
  const km   = a.distance > 0 ? (a.distance / 1000).toFixed(1) : null;
  const el   = a.total_elevation_gain > 0 ? Math.round(a.total_elevation_gain) : null;

  return (
    <div style={{
      background: T.bg, borderRadius: 12, padding: '10px 12px', marginBottom: 8,
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: STRAVA_ORANGE + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
      }}>
        {sportIcon(a.sport_type)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.name}
        </div>
        <div style={{ fontSize: 11, color: T.muted, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span>⏱ {formatDuration(a.moving_time)}</span>
          {km    && <span>📍 {km} km</span>}
          {el    && <span>⛰ +{el} m</span>}
          {a.average_heartrate && <span>❤️ {Math.round(a.average_heartrate)} bpm</span>}
        </div>
      </div>
      {kcal > 0 && (
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: STRAVA_ORANGE,
            fontFamily: 'Syne,sans-serif' }}>{kcal.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>kcal</div>
        </div>
      )}
    </div>
  );
}

// ── Connect prompt ────────────────────────────────────────────
function ConnectPrompt() {
  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: STRAVA_ORANGE,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>🚴</div>
        <div>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: T.text }}>
            Strava aktivity
          </div>
          <div style={{ fontSize: 11, color: T.muted }}>Posledních 3 dny</div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
        Připoj Strava a zobrazí se ti přehled aktivit, spálené kalorie a statistiky za posledních 3 dny.
      </div>
      <button
        onClick={() => startStravaOAuth()}
        style={{
          width: '100%', padding: '12px', borderRadius: 12, cursor: 'pointer',
          background: STRAVA_ORANGE + '22', border: `1px solid ${STRAVA_ORANGE}66`,
          color: STRAVA_ORANGE, fontSize: 14, fontWeight: 700,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          fontFamily: 'Syne,sans-serif',
        }}
      >
        🚴 Připojit Strava
      </button>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function Plan() {
  const { activities, loading, error, stale, isConnected, cacheAge, sync, disconnect }
    = useStravaData(3);

  if (!isConnected) {
    return (
      <div style={{ padding: '16px 16px 100px' }}>
        <SectionTitle accent={STRAVA_ORANGE}>Aktivity</SectionTitle>
        <ConnectPrompt />
      </div>
    );
  }

  // Group by local date
  const byDate = activities.reduce<Record<string, StravaActivity[]>>((acc, a) => {
    const d = activityDateLocal(a);
    (acc[d] ??= []).push(a);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <SectionTitle accent={STRAVA_ORANGE} style={{ margin: 0 }}>Aktivity</SectionTitle>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {cacheAge && <span style={{ fontSize: 10, color: T.muted }}>{cacheAge}</span>}
          <button onClick={sync} disabled={loading} style={{
            background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer',
            color: T.muted, padding: 4, display: 'flex',
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

      {stale && (
        <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 12 }}>
          Zobrazuji offline data. Zkontroluj připojení.
        </div>
      )}

      {loading && !activities.length ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: T.muted }}>
          <Spinner color={STRAVA_ORANGE} size={28} />
          <div style={{ marginTop: 12, fontSize: 13 }}>Načítám aktivity ze Stravy…</div>
        </div>
      ) : error && !activities.length ? (
        <Card>
          <div style={{ fontSize: 13, color: '#ff375f', marginBottom: 8 }}>{error}</div>
          <button onClick={sync} style={{
            background: '#ff375f18', border: '1px solid #ff375f44', borderRadius: 8,
            color: '#ff375f', padding: '6px 14px', fontSize: 12, cursor: 'pointer',
          }}>Zkusit znovu</button>
        </Card>
      ) : dates.length === 0 ? (
        <Card>
          <div style={{ fontSize: 14, color: T.muted, textAlign: 'center', padding: '20px 0' }}>
            Za poslední 3 dny žádné aktivity.
          </div>
        </Card>
      ) : (
        dates.map(date => (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: T.muted,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
            }}>
              {formatDateLabel(date)}
            </div>
            <DaySummary activities={byDate[date]} />
            {byDate[date].map(a => <ActivityCard key={a.id} a={a} />)}
          </div>
        ))
      )}

      <button onClick={disconnect} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: T.muted, fontSize: 10, display: 'block', margin: '8px auto 0',
        textDecoration: 'underline',
      }}>
        Odpojit Strava
      </button>
    </div>
  );
}
