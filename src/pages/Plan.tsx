import { T, Card, Spinner } from '../components/UI';
import {
  activityKcal, sportIcon, formatDuration,
  type IntervalsActivity,
} from '../services/intervalsService';
import { useIntervalsData } from '../hooks/useIntervalsData';
import { IntervalsCard } from '../components/IntervalsCard';

const ICU_COLOR = '#0088ff';

function dateLabel(iso: string): string {
  const today = new Date().toISOString().split('T')[0];
  const yest  = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
  if (iso === today) return 'Dnes';
  if (iso === yest)  return 'Včera';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric' });
}

function DaySummary({ acts }: { acts: IntervalsActivity[] }) {
  const kcal = acts.reduce((s, a) => s + activityKcal(a), 0);
  const time = acts.reduce((s, a) => s + a.moving_time, 0);
  const dist = acts.reduce((s, a) => s + a.distance, 0);
  const tss  = acts.reduce((s, a) => s + (a.icu_training_load ?? 0), 0);

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
      {kcal > 0 && (
        <div style={{ flex: 1, background: T.bg, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: ICU_COLOR, fontFamily: 'Syne,sans-serif' }}>
            {kcal.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>kcal</div>
        </div>
      )}
      {time > 0 && (
        <div style={{ flex: 1, background: T.bg, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'Syne,sans-serif' }}>
            {formatDuration(time)}
          </div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>čas</div>
        </div>
      )}
      {dist > 500 && (
        <div style={{ flex: 1, background: T.bg, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: 'Syne,sans-serif' }}>
            {(dist / 1000).toFixed(1)}
          </div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>km</div>
        </div>
      )}
      {tss > 0 && (
        <div style={{ flex: 1, background: T.bg, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', fontFamily: 'Syne,sans-serif' }}>
            {Math.round(tss)}
          </div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>TSS</div>
        </div>
      )}
    </div>
  );
}

function ActivityCard({ a }: { a: IntervalsActivity }) {
  const kcal = activityKcal(a);
  const km   = a.distance > 0 ? (a.distance / 1000).toFixed(1) : null;
  const el   = a.total_elevation_gain > 0 ? Math.round(a.total_elevation_gain) : null;

  return (
    <div style={{
      background: T.bg, borderRadius: 12, padding: '10px 12px', marginBottom: 8,
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: ICU_COLOR + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
      }}>
        {sportIcon(a.type)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.name}
        </div>
        <div style={{ fontSize: 11, color: T.muted, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span>⏱ {formatDuration(a.moving_time)}</span>
          {km && <span>📍 {km} km</span>}
          {el && <span>⛰ +{el} m</span>}
          {a.average_heartrate && <span>❤️ {Math.round(a.average_heartrate)} bpm</span>}
          {a.weighted_average_watts && <span>⚡ {Math.round(a.weighted_average_watts)} W</span>}
        </div>
      </div>
      {kcal > 0 && (
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: ICU_COLOR, fontFamily: 'Syne,sans-serif' }}>
            {kcal.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>kcal</div>
        </div>
      )}
    </div>
  );
}

export default function Plan() {
  const { activities, loading, error, stale, isConnected, cacheAge, sync, disconnect }
    = useIntervalsData(3);

  if (!isConnected) {
    return (
      <div style={{ padding: '16px 16px 100px' }}>
        <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13,
          color: ICU_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          Aktivity
        </div>
        <IntervalsCard />
      </div>
    );
  }

  const byDate = activities.reduce<Record<string, IntervalsActivity[]>>((acc, a) => {
    const d = a.start_date_local.split('T')[0];
    (acc[d] ??= []).push(a);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13,
          color: ICU_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Aktivity — poslední 3 dny
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

      {stale && (
        <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 12 }}>
          Offline data — zkontroluj připojení.
        </div>
      )}

      {loading && !activities.length ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: T.muted }}>
          <Spinner color={ICU_COLOR} size={28} />
          <div style={{ marginTop: 12, fontSize: 13 }}>Načítám aktivity…</div>
        </div>
      ) : error && !activities.length ? (
        <Card>
          <div style={{ fontSize: 13, color: '#ff375f', marginBottom: 8 }}>{error}</div>
          <button onClick={() => sync()} style={{
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
            <div style={{ fontSize: 12, fontWeight: 700, color: T.muted,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {dateLabel(date)}
            </div>
            <DaySummary acts={byDate[date]} />
            {byDate[date].map(a => <ActivityCard key={a.id} a={a} />)}
          </div>
        ))
      )}

      <button onClick={disconnect} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: T.muted, fontSize: 10, display: 'block', margin: '8px auto 0',
        textDecoration: 'underline',
      }}>
        Odpojit Intervals.icu
      </button>
    </div>
  );
}
