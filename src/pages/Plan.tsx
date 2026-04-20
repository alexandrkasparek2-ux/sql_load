import { T, BRAND, Spinner } from '../components/UI';
import {
  activityKcal, sportIcon, formatDuration,
  type IntervalsActivity,
} from '../services/intervalsService';
import { useIntervalsData } from '../hooks/useIntervalsData';
import { IntervalsCard } from '../components/IntervalsCard';

const ICU = BRAND.blue;

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

  const stats: { val: string; unit: string; color: string }[] = [];
  if (kcal > 0)   stats.push({ val: kcal.toLocaleString(), unit: 'kcal',  color: BRAND.gold });
  if (time > 0)   stats.push({ val: formatDuration(time),   unit: 'čas',   color: T.text    });
  if (dist > 500) stats.push({ val: (dist / 1000).toFixed(1), unit: 'km', color: ICU        });
  if (tss  > 0)   stats.push({ val: Math.round(tss).toString(), unit: 'TSS', color: BRAND.purple });

  if (!stats.length) return null;

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
      {stats.map(s => (
        <div key={s.unit} style={{
          flex: 1, background: T.bg, borderRadius: 10, padding: '8px 6px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
            {s.val}
          </div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 2 }}>
            {s.unit}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityCard({ a }: { a: IntervalsActivity }) {
  const kcal = activityKcal(a);
  const km   = a.distance > 0 ? (a.distance / 1000).toFixed(1) : null;
  const el   = a.total_elevation_gain > 0 ? Math.round(a.total_elevation_gain) : null;

  const chips: { icon: string; text: string }[] = [
    { icon: '⏱', text: formatDuration(a.moving_time) },
  ];
  if (km)                         chips.push({ icon: '📍', text: `${km} km` });
  if (el)                         chips.push({ icon: '⛰', text: `+${el} m` });
  if (a.average_heartrate)        chips.push({ icon: '❤️', text: `${Math.round(a.average_heartrate)} bpm` });
  if (a.icu_weighted_avg_watts)   chips.push({ icon: '⚡', text: `${Math.round(a.icu_weighted_avg_watts)} W` });
  if (a.icu_training_load)        chips.push({ icon: '📊', text: `TSS ${Math.round(a.icu_training_load)}` });

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
      padding: '12px 14px', marginBottom: 8,
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: ICU + '18', border: `1px solid ${ICU}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
      }}>
        {sportIcon(a.type)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 7,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {a.name}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {chips.map(c => (
            <span key={c.text} style={{
              fontSize: 10, color: T.muted,
              background: T.bg, border: `1px solid ${T.border}`,
              borderRadius: 6, padding: '3px 7px',
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              {c.icon} {c.text}
            </span>
          ))}
        </div>
      </div>
      {kcal > 0 && (
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: BRAND.gold, fontVariantNumeric: 'tabular-nums' }}>
            {kcal.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>kcal</div>
        </div>
      )}
    </div>
  );
}

export default function Plan() {
  const { activities, loading, error, stale, isConnected, cacheAge, sync, disconnect }
    = useIntervalsData(3);

  const today = new Date().toISOString().split('T')[0];

  if (!isConnected) {
    return (
      <div style={{ padding: '16px 16px 0', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 300,
          background: 'radial-gradient(ellipse at top, rgba(79,195,247,0.06), transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 9, color: T.muted, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
            Aktivity
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 20, letterSpacing: '-0.5px' }}>
            Plán & Aktivity
          </div>
          <IntervalsCard />
        </div>
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
    <div style={{ padding: '16px 16px 0', position: 'relative' }}>

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 300,
        background: 'radial-gradient(ellipse at top, rgba(79,195,247,0.06), transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div className="stagger-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, color: T.muted, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
              Poslední 3 dny
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.5px' }}>
              Plán & Aktivity
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            {cacheAge && (
              <span style={{
                fontSize: 10, color: T.muted, background: T.card,
                border: `1px solid ${T.border}`, borderRadius: 6, padding: '3px 8px',
              }}>
                {cacheAge}
              </span>
            )}
            <button
              onClick={() => sync()}
              disabled={loading}
              style={{
                width: 34, height: 34, borderRadius: 10,
                background: ICU + '18', border: `1px solid ${ICU}33`,
                color: ICU, cursor: loading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {loading ? <Spinner color={ICU} size={14} /> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Stale warning */}
        {stale && (
          <div style={{
            background: '#f59e0b18', border: '1px solid #f59e0b44', borderRadius: 10,
            padding: '8px 14px', marginBottom: 14, fontSize: 11, color: '#f59e0b',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            ⚠️ Offline data — zkontroluj připojení.
          </div>
        )}

        {/* Loading */}
        {loading && !activities.length ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spinner color={ICU} size={28} />
            <div style={{ marginTop: 12, fontSize: 13, color: T.muted }}>Načítám aktivity…</div>
          </div>

        /* Error */
        ) : error && !activities.length ? (
          <div style={{
            background: BRAND.red + '18', border: `1px solid ${BRAND.red}33`,
            borderRadius: 18, padding: 24, textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 13, color: BRAND.red, marginBottom: 14, fontWeight: 600 }}>{error}</div>
            <button
              onClick={() => sync()}
              style={{
                background: BRAND.red + '18', border: `1px solid ${BRAND.red}33`, borderRadius: 10,
                color: BRAND.red, padding: '8px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 600,
              }}
            >
              Zkusit znovu
            </button>
          </div>

        /* Empty */
        ) : dates.length === 0 ? (
          <div style={{
            background: 'linear-gradient(135deg, #0f0f0f, #0a0a0a)',
            border: `1px solid ${ICU}20`, borderRadius: 18, padding: 32, textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚴</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>
              Žádné aktivity
            </div>
            <div style={{ fontSize: 13, color: T.muted }}>
              Za poslední 3 dny žádné aktivity z Intervals.icu.
            </div>
          </div>

        /* Activity list */
        ) : (
          <>
            {dates.map((date, idx) => (
              <div key={date} className={`stagger-${Math.min(idx + 2, 5)}`} style={{ marginBottom: 22 }}>

                {/* Day header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700,
                    color: date === today ? ICU : T.muted,
                    textTransform: 'uppercase', letterSpacing: '1.5px', flexShrink: 0,
                  }}>
                    {dateLabel(date)}
                  </div>
                  <div style={{ height: 1, flex: 1, background: T.border }} />
                  <div style={{
                    fontSize: 9, color: T.muted, background: T.card,
                    border: `1px solid ${T.border}`, borderRadius: 5, padding: '2px 7px',
                  }}>
                    {byDate[date].length} {byDate[date].length === 1 ? 'aktivita' : 'aktivity'}
                  </div>
                </div>

                <DaySummary acts={byDate[date]} />

                {byDate[date].map(a => <ActivityCard key={a.id} a={a} />)}
              </div>
            ))}
          </>
        )}

        {/* Disconnect */}
        <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 20 }}>
          <button
            onClick={disconnect}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: T.muted, fontSize: 10, opacity: 0.6,
              textDecoration: 'underline',
            }}
          >
            Odpojit Intervals.icu
          </button>
        </div>

      </div>
    </div>
  );
}
