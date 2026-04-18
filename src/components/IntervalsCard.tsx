import { useState } from 'react';
import { T, Card, Spinner } from './UI';
import { activityKcal, sportIcon, formatDuration } from '../services/intervalsService';
import { useIntervalsData } from '../hooks/useIntervalsData';

const ICU_COLOR = '#0088ff';

function todayLocal(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Setup form ────────────────────────────────────────────────
function SetupForm({ onConnect, loading, error }: {
  onConnect: (athleteId: string, apiKey: string) => void;
  loading: boolean; error: string | null;
}) {
  const [athleteId, setAthleteId] = useState('');
  const [apiKey,    setApiKey]    = useState('');

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
    background: T.bg, border: `1px solid ${T.border}`, color: T.text,
    outline: 'none', boxSizing: 'border-box' as const,
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: ICU_COLOR,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>⚡</div>
        <div>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: T.text }}>
            Intervals.icu
          </div>
          <div style={{ fontSize: 11, color: T.muted }}>Aktivity · Kalorie · TSS</div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: 12 }}>
        Najdeš v <span style={{ color: T.text }}>intervals.icu → Settings → API Key</span>.
        Athlete ID je v URL tvého profilu (např. <span style={{ color: T.text }}>i123456</span>).
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <input
          placeholder="Athlete ID (např. i123456)"
          value={athleteId}
          onChange={e => setAthleteId(e.target.value.trim())}
          style={inputStyle}
        />
        <input
          placeholder="API Key"
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value.trim())}
          style={inputStyle}
        />
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#ff375f', marginBottom: 8 }}>
          {error.includes('401') || error.includes('403')
            ? 'Špatné přihlašovací údaje — zkontroluj Athlete ID a API Key'
            : error}
        </div>
      )}

      <button
        onClick={() => onConnect(athleteId, apiKey)}
        disabled={loading || !athleteId || !apiKey}
        style={{
          width: '100%', padding: '12px', borderRadius: 12,
          cursor: loading || !athleteId || !apiKey ? 'default' : 'pointer',
          background: ICU_COLOR + '22', border: `1px solid ${ICU_COLOR}66`,
          color: ICU_COLOR, fontSize: 14, fontWeight: 700,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'Syne,sans-serif', opacity: !athleteId || !apiKey ? 0.5 : 1,
        }}
      >
        {loading ? <><Spinner color={ICU_COLOR} size={16} /> Připojuji…</> : '⚡ Připojit Intervals.icu'}
      </button>
    </Card>
  );
}

// ── Activity row ──────────────────────────────────────────────
function ActivityRow({ a }: { a: Parameters<typeof activityKcal>[0] & { name: string; type: string; moving_time: number; distance: number; icu_training_load: number | null } }) {
  const kcal = activityKcal(a);
  const km   = a.distance > 0 ? (a.distance / 1000).toFixed(1) : null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0', borderBottom: `1px solid ${T.border}`,
    }}>
      <span style={{ fontSize: 20, width: 26, textAlign: 'center' }}>{sportIcon(a.type)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.name}
        </div>
        <div style={{ fontSize: 11, color: T.muted }}>
          {formatDuration(a.moving_time)}
          {km && ` · ${km} km`}
          {a.icu_training_load != null && ` · TSS ${Math.round(a.icu_training_load)}`}
        </div>
      </div>
      {kcal > 0 && (
        <div style={{ fontSize: 13, fontWeight: 700, color: ICU_COLOR, flexShrink: 0 }}>
          {kcal.toLocaleString()} kcal
        </div>
      )}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────
export function IntervalsCard() {
  const { activities, loading, error, stale, isConnected,
          cacheAge, connect, sync, disconnect } = useIntervalsData(1);

  const handleConnect = async (athleteId: string, apiKey: string) => {
    await connect({ athleteId, apiKey });
  };

  if (!isConnected) return <SetupForm onConnect={handleConnect} loading={loading} error={error} />;

  const today     = todayLocal();
  const todayActs = activities.filter(a => a.start_date_local.startsWith(today));
  const totalKcal = todayActs.reduce((s, a) => s + activityKcal(a), 0);

  return (
    <Card style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: T.text }}>
            Intervals dnes
          </span>
          {stale && (
            <span style={{ fontSize: 10, color: '#f59e0b', background: '#f59e0b18',
              padding: '2px 6px', borderRadius: 6 }}>offline</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {cacheAge && <span style={{ fontSize: 10, color: T.muted }}>{cacheAge}</span>}
          <button onClick={() => sync()} disabled={loading} style={{
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

      {loading && !activities.length ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: T.muted, fontSize: 13 }}>
          <Spinner color={ICU_COLOR} size={22} />
          <div style={{ marginTop: 8 }}>Načítám aktivity…</div>
        </div>
      ) : error && !activities.length ? (
        <div style={{ textAlign: 'center', padding: '14px 0' }}>
          <div style={{ fontSize: 13, color: '#ff375f', marginBottom: 8 }}>{error}</div>
          <button onClick={() => sync()} style={{
            background: '#ff375f18', border: '1px solid #ff375f44', borderRadius: 8,
            color: '#ff375f', padding: '6px 14px', fontSize: 12, cursor: 'pointer',
          }}>Zkusit znovu</button>
        </div>
      ) : (
        <>
          {todayActs.length === 0 ? (
            <div style={{ fontSize: 13, color: T.muted, padding: '6px 0 10px', textAlign: 'center' }}>
              Dnes zatím žádná aktivita
            </div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              {todayActs.map(a => <ActivityRow key={a.id} a={a} />)}
            </div>
          )}

          {totalKcal > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: ICU_COLOR + '14', border: `1px solid ${ICU_COLOR}33`,
              borderRadius: 10, padding: '10px 12px', marginBottom: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Spáleno dnes</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: ICU_COLOR,
                  fontFamily: 'Syne,sans-serif' }}>
                  {totalKcal.toLocaleString()} kcal
                </div>
              </div>
              <div style={{ fontSize: 11, color: ICU_COLOR, background: ICU_COLOR + '22',
                padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>
                Cíl upraven ↑
              </div>
            </div>
          )}

          <button onClick={disconnect} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.muted, fontSize: 10, width: '100%', padding: '4px 0',
            textDecoration: 'underline',
          }}>
            Odpojit Intervals.icu
          </button>
        </>
      )}
    </Card>
  );
}
