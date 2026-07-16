import { T, BRAND, Card, SectionTitle, Spinner } from '../components/UI';
import { useStravaData } from '../hooks/useStravaData';
import { useWhoopData } from '../hooks/useWhoopData';
import { useWhoopHistory } from '../hooks/useWhoopHistory';
import { startStravaOAuth } from '../services/stravaService';
import { startOAuth as startWhoopOAuth } from '../services/whoopService';
import { bucketActivitiesByWeek, bucketRecoveryByWeek } from '../utils/weeklyTraining';

const STRAVA_ORANGE = '#fc4c02';
const WHOOP_BLUE     = '#4FE3FF';
const WEEKS_BACK     = 8;
const DAYS_BACK      = WEEKS_BACK * 7 + 7; // buffer so the oldest full week isn't cut short

// ─── Small trend bar chart ─────────────────────────────────────
function TrendBars({ labels, values, unit, accent, decimals = 0 }: {
  labels: string[]; values: (number | null)[]; unit: string; accent: string; decimals?: number;
}) {
  const nums = values.filter((v): v is number => v !== null);
  const max  = Math.max(...nums, 1);
  const barW = 26, gap = 8, H = 56;
  const W = values.length * (barW + gap);
  const last = values[values.length - 1];

  return (
    <div>
      <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        <svg viewBox={`0 0 ${W} ${H + 18}`} width={W} height={H + 18} style={{ display: 'block', minWidth: '100%' }}>
          {values.map((v, i) => {
            const x = i * (barW + gap);
            const isLast = i === values.length - 1;
            const h = v !== null ? Math.max(3, (v / max) * H) : 0;
            const y = H - h;
            return (
              <g key={i}>
                <rect x={x} y={0} width={barW} height={H} rx={4} fill={T.border + '60'} />
                {v !== null && (
                  <rect x={x} y={y} width={barW} height={h} rx={4} fill={isLast ? accent : accent + '55'} />
                )}
                <text x={x + barW / 2} y={H + 13} textAnchor="middle" fontSize={8} fill={T.muted}>
                  {labels[i].split('–')[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
        Tento týden: <strong style={{ color: T.text }}>{last !== null ? `${last.toFixed(decimals)} ${unit}` : '—'}</strong>
      </div>
    </div>
  );
}

// ─── Connect prompt ─────────────────────────────────────────────
function ConnectPrompt({ label, desc, color, icon, onClick }: {
  label: string; desc: string; color: string; icon: string; onClick: () => void;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '18px 8px' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>{desc}</div>
      <button
        onClick={onClick}
        style={{
          padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
          background: color + '22', border: `1px solid ${color}66`,
          color, fontSize: 13, fontWeight: 700,
        }}
      >
        Připojit {label}
      </button>
    </div>
  );
}

function StatBox({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) {
  return (
    <div style={{ background: T.bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'Syne,sans-serif' }}>
        {value}{unit && <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 2 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      background: BRAND.purple + '18', border: `1px solid ${BRAND.purple}44`,
      color: BRAND.purple, borderRadius: 10, padding: '7px 14px',
      fontSize: 12, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {loading ? <Spinner color={BRAND.purple} size={13} /> : '🔄'} Aktualizovat
    </button>
  );
}

export default function TrainingDashboard() {
  const strava   = useStravaData(DAYS_BACK);
  const whoopNow = useWhoopData();
  const whoopHist = useWhoopHistory(DAYS_BACK);

  const trainingWeeks = bucketActivitiesByWeek(strava.activities, WEEKS_BACK);
  const recoveryWeeks = bucketRecoveryByWeek(whoopHist.data, WEEKS_BACK);
  const weekLabels    = trainingWeeks.map(w => w.label);

  const thisWeek = trainingWeeks[trainingWeeks.length - 1];
  const lastWeek = trainingWeeks[trainingWeeks.length - 2];
  const kmDelta  = thisWeek && lastWeek ? thisWeek.km - lastWeek.km : 0;

  const refreshAll = () => {
    if (strava.isConnected) strava.sync();
    if (whoopNow.isConnected) whoopNow.sync();
    if (whoopHist.isConnected) whoopHist.sync();
  };

  const anyLoading = strava.loading || whoopNow.loading || whoopHist.loading;

  return (
    <div style={{ padding: '4px 2px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 18, color: T.text }}>
            Týdenní přehled
          </div>
          <div style={{ fontSize: 12, color: T.muted }}>Trénink a regenerace, posledních {WEEKS_BACK} týdnů</div>
        </div>
        <RefreshButton loading={anyLoading} onClick={refreshAll} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {/* ── Training column ─────────────────────────────────── */}
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <SectionTitle accent={STRAVA_ORANGE}>🚴 Trénink</SectionTitle>
          <Card style={{ marginBottom: 16 }} accent={STRAVA_ORANGE}>
            {!strava.isConnected ? (
              <ConnectPrompt
                label="Strava" color={STRAVA_ORANGE} icon="🚴"
                desc="Připoj Strava a uvidíš tu svůj týdenní objem, převýšení a tepovku."
                onClick={startStravaOAuth}
              />
            ) : strava.loading && !strava.activities.length ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <Spinner color={STRAVA_ORANGE} size={20} />
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                  <StatBox label="Objem" value={`${thisWeek?.km ?? 0}`} unit="km" color={STRAVA_ORANGE} />
                  <StatBox label="Převýšení" value={`${thisWeek?.vertM ?? 0}`} unit="m" color={STRAVA_ORANGE} />
                  <StatBox label="Avg TF" value={thisWeek?.avgHr ? `${thisWeek.avgHr}` : '—'} unit="bpm" color={STRAVA_ORANGE} />
                  <StatBox label="Tréninky" value={`${thisWeek?.sessions ?? 0}`} color={STRAVA_ORANGE} />
                </div>
                {lastWeek && (
                  <div style={{ fontSize: 11, color: kmDelta >= 0 ? '#30d158' : '#ff375f', marginBottom: 14 }}>
                    {kmDelta >= 0 ? '▲' : '▼'} {Math.abs(kmDelta).toFixed(1)} km oproti minulému týdnu
                  </div>
                )}

                <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Objem (km/týden)
                </div>
                <TrendBars labels={weekLabels} values={trainingWeeks.map(w => w.km)} unit="km" accent={STRAVA_ORANGE} decimals={1} />

                <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '14px 0 6px' }}>
                  Převýšení (m/týden)
                </div>
                <TrendBars labels={weekLabels} values={trainingWeeks.map(w => w.vertM)} unit="m" accent={STRAVA_ORANGE} />

                <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '14px 0 6px' }}>
                  Průměrná tepovka (bpm)
                </div>
                <TrendBars labels={weekLabels} values={trainingWeeks.map(w => w.avgHr)} unit="bpm" accent={STRAVA_ORANGE} />
              </>
            )}
          </Card>
        </div>

        {/* ── Recovery column ─────────────────────────────────── */}
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <SectionTitle accent={WHOOP_BLUE}>💤 Regenerace</SectionTitle>
          <Card style={{ marginBottom: 16 }} accent={WHOOP_BLUE}>
            {!whoopNow.isConnected ? (
              <ConnectPrompt
                label="Whoop" color={WHOOP_BLUE} icon="💤"
                desc="Připoj Whoop a uvidíš tu svou regeneraci, HRV a spánek den po dni."
                onClick={startWhoopOAuth}
              />
            ) : whoopNow.loading && !whoopNow.data ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <Spinner color={WHOOP_BLUE} size={20} />
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                  <StatBox label="Recovery" value={whoopNow.data?.recovery ? `${whoopNow.data.recovery.score.recovery_score}` : '—'} unit="%" color={WHOOP_BLUE} />
                  <StatBox label="HRV" value={whoopNow.data?.recovery ? `${Math.round(whoopNow.data.recovery.score.hrv_rmssd_milli)}` : '—'} unit="ms" color={WHOOP_BLUE} />
                  <StatBox label="Klid. TF" value={whoopNow.data?.recovery ? `${Math.round(whoopNow.data.recovery.score.resting_heart_rate)}` : '—'} unit="bpm" color={WHOOP_BLUE} />
                  <StatBox label="Spánek" value={whoopNow.data?.sleep ? `${whoopNow.data.sleep.score.sleep_performance_percentage}` : '—'} unit="%" color={WHOOP_BLUE} />
                </div>

                <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Recovery skóre (týdenní průměr)
                </div>
                <TrendBars labels={weekLabels} values={recoveryWeeks.map(w => w.avgRecovery)} unit="%" accent={WHOOP_BLUE} />

                <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '14px 0 6px' }}>
                  HRV (týdenní průměr)
                </div>
                <TrendBars labels={weekLabels} values={recoveryWeeks.map(w => w.avgHrv)} unit="ms" accent={WHOOP_BLUE} />

                <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '14px 0 6px' }}>
                  Spánek (hodiny/noc, týdenní průměr)
                </div>
                <TrendBars labels={weekLabels} values={recoveryWeeks.map(w => w.avgSleepHours)} unit="h" accent={WHOOP_BLUE} decimals={1} />

                {whoopHist.error && (
                  <div style={{ fontSize: 11, color: '#ff375f', marginTop: 10 }}>
                    Historii regenerace se nepodařilo načíst ({whoopHist.error}).
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
