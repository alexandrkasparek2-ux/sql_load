import { useState } from 'react';
import { T, Card, Spinner } from './UI';
import { startOAuth, calcWhoopAdjustment } from '../services/whoopService';
import { useWhoopData } from '../hooks/useWhoopData';

// ── Recovery ring SVG ─────────────────────────────────────────
function RecoveryRing({ score, color }: { score: number; color: string }) {
  const R = 38, sw = 7;
  const circ = 2 * Math.PI * R;
  const pct  = Math.min(100, Math.max(0, score));
  const dash = (pct / 100) * circ;

  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      <defs>
        <filter id="whoopGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Track */}
      <circle cx={50} cy={50} r={R} fill="none" stroke={T.border} strokeWidth={sw} />
      {/* Progress */}
      <circle
        cx={50} cy={50} r={R}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ / 4}
        style={{ filter: `url(#whoopGlow)`, transition: 'stroke-dasharray 0.6s ease' }}
      />
      {/* Center */}
      <text x={50} y={46} textAnchor="middle" fontSize={18} fontWeight={800}
        fill={color} fontFamily="Syne, sans-serif">{pct}%</text>
      <text x={50} y={60} textAnchor="middle" fontSize={9} fill={T.muted}>Recovery</text>
    </svg>
  );
}

// ── Stat pill ─────────────────────────────────────────────────
function StatPill({ icon, label, value, sub }: {
  icon: string; label: string; value: string; sub?: string;
}) {
  return (
    <div style={{
      background: T.bg, borderRadius: 12, padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 3, flex: 1,
    }}>
      <div style={{ fontSize: 14 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'Syne,sans-serif' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: T.muted }}>{sub}</div>}
      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
    </div>
  );
}

// ── Connect button ────────────────────────────────────────────
function ConnectButton() {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try { await startOAuth(); }
    catch { setConnecting(false); }
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: '#1a1a1a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid #333',
        }}>
          <span style={{ fontSize: 20 }}>⌚</span>
        </div>
        <div>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: T.text }}>
            Whoop
          </div>
          <div style={{ fontSize: 11, color: T.muted }}>Recovery · HRV · Spánek</div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
        Připoj Whoop a app automaticky přizpůsobí kalorický cíl a makra
        podle tvé denní regenerace.
      </div>

      <button
        onClick={handleConnect}
        disabled={connecting}
        style={{
          width: '100%', padding: '12px', borderRadius: 12, cursor: 'pointer',
          background: '#00e5cc22', border: '1px solid #00e5cc55',
          color: '#00e5cc', fontSize: 14, fontWeight: 700,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'Syne,sans-serif',
        }}
      >
        {connecting ? <><Spinner color="#00e5cc" size={16} /> Přesměrovávám…</> : '⌚ Připojit Whoop'}
      </button>
    </Card>
  );
}

// ── Main WhoopCard ────────────────────────────────────────────
export function WhoopCard() {
  const { data, loading, error, stale, isConnected, cacheAge, sync, disconnect } = useWhoopData();

  if (!isConnected) return <ConnectButton />;

  const recovery   = data?.recovery ?? null;
  const sleep      = data?.sleep    ?? null;
  const cycle      = data?.cycle    ?? null;
  const adjustment = calcWhoopAdjustment(recovery);

  const score = recovery?.score.recovery_score    ?? null;
  const hrv   = recovery?.score.hrv_rmssd_milli   ?? null;
  const rhr   = recovery?.score.resting_heart_rate ?? null;
  const strain = cycle?.score.strain ?? null;

  const sleepH = sleep
    ? (() => {
        const ms = new Date(sleep.end).getTime() - new Date(sleep.start).getTime();
        return (ms / 3_600_000).toFixed(1);
      })()
    : null;
  const sleepEff = sleep?.score.sleep_efficiency_percentage ?? null;

  const color = score != null ? adjustment.color : '#64748b';

  return (
    <Card style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⌚</span>
          <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: T.text }}>Whoop</span>
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
          <Spinner color="#00e5cc" size={24} />
          <div style={{ marginTop: 8 }}>Načítám data z Whoopu…</div>
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
          {/* Recovery ring + stats row */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            {score != null
              ? <RecoveryRing score={score} color={color} />
              : (
                <div style={{ width: 100, height: 100, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: T.muted, fontSize: 12 }}>Žádná data</div>
              )}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <StatPill icon="💓" label="HRV" value={hrv != null ? `${Math.round(hrv)} ms` : '—'} />
                <StatPill icon="❤️" label="RHR" value={rhr != null ? `${rhr} bpm` : '—'} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <StatPill icon="😴" label="Spánek"
                  value={sleepH != null ? `${sleepH} h` : '—'}
                  sub={sleepEff != null ? `${Math.round(sleepEff)}% efektivita` : undefined}
                />
                <StatPill icon="⚡" label="Strain"
                  value={strain != null ? strain.toFixed(1) : '—'}
                  sub="0–21 škála"
                />
              </div>
            </div>
          </div>

          {/* Recovery message */}
          {score != null && (
            <div style={{
              background: color + '14', border: `1px solid ${color}33`,
              borderRadius: 10, padding: '10px 12px', marginBottom: 12,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: color,
                marginTop: 4, flexShrink: 0,
                boxShadow: `0 0 6px ${color}`,
              }} />
              <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>
                {adjustment.message}
              </div>
            </div>
          )}

          {/* Kcal adjustment badge */}
          {adjustment.kcalMultiplier !== 1.0 && (
            <div style={{ fontSize: 11, color: T.muted, textAlign: 'center', marginBottom: 8 }}>
              Kalorický cíl upraven na{' '}
              <span style={{ color, fontWeight: 700 }}>
                {adjustment.kcalMultiplier < 1 ? '−' : '+'}{Math.round(Math.abs(1 - adjustment.kcalMultiplier) * 100)}%
              </span>
              {' '}dle regenerace
            </div>
          )}

          {/* Disconnect */}
          <button onClick={disconnect} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.muted, fontSize: 10, width: '100%', padding: '4px 0',
            textDecoration: 'underline',
          }}>
            Odpojit Whoop
          </button>
        </>
      )}
    </Card>
  );
}
