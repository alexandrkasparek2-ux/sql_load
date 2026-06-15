import { useState, useMemo, useEffect } from 'react';

const ACCENT = '#c8a97e';

interface CoffeeEntry {
  id: number;
  date: string;
  name: string;
  origin: string;
  roast: string;
  basket: string;
  grind: string;
  doseIn: string;
  doseOut: string;
  time: string;
  rating: number;
  taste: string[];
  notes: string;
  fav: boolean;
}

type View = 'list' | 'form' | 'detail' | 'stats';

const EMPTY: Omit<CoffeeEntry, 'id'> & { id: number | null } = {
  id: null,
  date: new Date().toISOString().slice(0, 10),
  name: '',
  origin: '',
  roast: 'střední',
  basket: '18g',
  grind: '',
  doseIn: '18',
  doseOut: '',
  time: '',
  rating: 0,
  taste: [],
  notes: '',
  fav: false,
};

const ROASTS = ['světlá', 'střední', 'tmavá'];
const BASKETS = ['18g', '9g'];
const TASTES = ['čokoláda', 'karamel', 'ořechy', 'ovoce', 'citrus', 'kyselá', 'sladká', 'hořká', 'plná', 'med'];
const FLAG: Record<string, string> = {
  'Brazílie': '🇧🇷', 'Kolumbie': '🇨🇴', 'Etiopie': '🇪🇹', 'Kenya': '🇰🇪',
  'Guatemala': '🇬🇹', 'Mexiko': '🇲🇽', 'Honduras': '🇭🇳', 'El Salvador': '🇸🇻',
  'Nicaragua': '🇳🇮', 'Costa Rica': '🇨🇷', 'Peru': '🇵🇪', 'Jemen': '🇾🇪',
  'Indonésie': '🇮🇩', 'Papua Nová Guinea': '🇵🇬', 'Tanzania': '🇹🇿', 'Rwanda': '🇷🇼',
  'Uganda': '🇺🇬', 'Burundi': '🇧🇮', 'Jiný': '🫘',
};
const RLABEL = ['', 'Špatná', 'Ujde', 'Dobrá', 'Výborná', 'Perfektní'];
const STORAGE_KEY = 'cyclofuel_coffee_journal';

function loadEntries(): CoffeeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CoffeeEntry[]) : [];
  } catch { return []; }
}

export default function CoffeeJournal() {
  const [entries, setEntries] = useState<CoffeeEntry[]>(loadEntries);
  const [view, setView] = useState<View>('list');
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });
  const [sel, setSel] = useState<CoffeeEntry | null>(null);
  const [q, setQ] = useState('');
  const [del, setDel] = useState<CoffeeEntry | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2000);
  };

  const submit = () => {
    if (!form.name.trim()) return;
    const e: CoffeeEntry = { ...form, id: form.id ?? Date.now() };
    setEntries(form.id
      ? entries.map(x => (x.id === e.id ? e : x))
      : [e, ...entries],
    );
    setForm({ ...EMPTY });
    setView('list');
    flash(form.id ? 'Uloženo ✓' : 'Přidáno ✓');
  };

  const remove = (id: number) => {
    setEntries(entries.filter(x => x.id !== id));
    setDel(null);
    setView('list');
    setSel(null);
    flash('Smazáno');
  };

  const dup = (e: CoffeeEntry) => {
    setForm({ ...e, id: null, date: new Date().toISOString().slice(0, 10), rating: 0, taste: [], notes: '', fav: false });
    setView('form');
    flash('Nastavení zkopírováno');
  };

  const toggleFav = (id: number) =>
    setEntries(entries.map(x => (x.id === id ? { ...x, fav: !x.fav } : x)));

  const tag = (t: string) =>
    setForm(f => ({
      ...f,
      taste: f.taste.includes(t) ? f.taste.filter(x => x !== t) : [...f.taste, t],
    }));

  const ratio = (i: string, o: string) =>
    i && o ? `1:${(parseFloat(o) / parseFloat(i)).toFixed(1)}` : '—';

  const timeState = (t: string): 'fast' | 'slow' | 'ok' | null => {
    const n = parseFloat(t);
    if (!n) return null;
    return n < 20 ? 'fast' : n > 32 ? 'slow' : 'ok';
  };

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return entries.filter(
      e => !k
        || e.name.toLowerCase().includes(k)
        || (e.origin ?? '').toLowerCase().includes(k)
        || (e.taste ?? []).some(t => t.includes(k)),
    );
  }, [entries, q]);

  return (
    <div style={s.root}>
      <div style={s.head}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {view !== 'list' && (
            <button style={s.back} onClick={() => setView('list')}>←</button>
          )}
          <span style={{ fontSize: 24 }}>☕</span>
          <div>
            <div style={s.title}>Kávový deník</div>
            <div style={s.sub}>Gaggia Classic · Eureka Zero</div>
          </div>
        </div>
      </div>

      {/* LIST */}
      {view === 'list' && (
        <div style={s.pad}>
          <input
            style={s.inp}
            placeholder="🔍 Hledat kávu, původ, chuť…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {entries.length > 0 && (
            <div style={s.statRow}>
              <Stat v={entries.length} l="káv" />
              <Stat v={(entries.reduce((a, e) => a + e.rating, 0) / entries.length).toFixed(1)} l="Ø hodnocení" />
              <Stat v={entries.filter(e => e.fav).length} l="oblíbené" />
              <button style={s.statsBtn} onClick={() => setView('stats')}>📊</button>
            </div>
          )}
          {entries.length === 0 && (
            <div style={s.empty}>
              <div style={{ fontSize: 44 }}>☕</div>
              <div style={{ marginTop: 8 }}>Zatím žádné záznamy</div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Klepni na + dole</div>
            </div>
          )}
          {entries.length > 0 && list.length === 0 && <div style={s.empty}>Nic nenalezeno</div>}
          {list.map(e => (
            <div key={e.id} style={s.card} onClick={() => { setSel(e); setView('detail'); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>
                  {e.fav && <span style={{ color: ACCENT }}>★ </span>}
                  {FLAG[e.origin] ?? '🫘'} {e.name}
                </div>
                <Stars n={e.rating} />
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 13 }}>
                <span style={{ color: '#888' }}>⚙️ <b style={{ color: ACCENT }}>{e.grind || '—'}</b></span>
                <span style={{ color: '#888' }}>⚖️ <b style={{ color: ACCENT }}>{e.doseIn || '?'}→{e.doseOut || '?'}g</b></span>
                <span style={{ color: '#888' }}>⏱️ <b style={{ color: ACCENT }}>{e.time ? e.time + 's' : '—'}</b></span>
              </div>
              <div style={{ fontSize: 11, color: '#444', textAlign: 'right', marginTop: 6 }}>{e.date}</div>
            </div>
          ))}
        </div>
      )}

      {/* STATS */}
      {view === 'stats' && <StatsView entries={entries} />}

      {/* FORM */}
      {view === 'form' && (
        <div style={s.pad}>
          <div style={s.h2}>{form.id ? '✏️ Upravit' : '☕ Nový záznam'}</div>

          <L t="Název kávy *" />
          <input
            style={s.inp}
            placeholder="např. Doubleshot Brazil"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />

          <div style={s.grid2}>
            <div>
              <L t="Původ" />
              <select style={s.inp} value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}>
                <option value="">—</option>
                {Object.keys(FLAG).map(o => <option key={o} value={o}>{FLAG[o]} {o}</option>)}
              </select>
            </div>
            <div>
              <L t="Pražba" />
              <select style={s.inp} value={form.roast} onChange={e => setForm(f => ({ ...f, roast: e.target.value }))}>
                {ROASTS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div style={s.grid2}>
            <div>
              <L t="Košíček" />
              <select style={s.inp} value={form.basket} onChange={e => setForm(f => ({ ...f, basket: e.target.value }))}>
                {BASKETS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <L t="Hrubost mletí" />
              <input
                style={s.inp}
                type="text"
                inputMode="decimal"
                placeholder="4.6"
                value={form.grind}
                onChange={e => setForm(f => ({ ...f, grind: e.target.value }))}
              />
            </div>
          </div>

          <div style={s.grid3}>
            <div>
              <L t="IN (g)" />
              <input
                style={s.inp}
                type="number"
                inputMode="decimal"
                placeholder="18"
                value={form.doseIn}
                onChange={e => setForm(f => ({ ...f, doseIn: e.target.value }))}
              />
            </div>
            <div>
              <L t="OUT (g)" />
              <input
                style={s.inp}
                type="number"
                inputMode="decimal"
                placeholder="36"
                value={form.doseOut}
                onChange={e => setForm(f => ({ ...f, doseOut: e.target.value }))}
              />
            </div>
            <div>
              <L t="Čas (s)" />
              <input
                style={{
                  ...s.inp,
                  borderColor: timeState(form.time) === 'ok'
                    ? '#4a7a4a'
                    : timeState(form.time) === 'fast'
                      ? '#c8a000'
                      : timeState(form.time) === 'slow'
                        ? '#a04040'
                        : '#333',
                }}
                type="number"
                inputMode="numeric"
                placeholder="27"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              />
            </div>
          </div>

          {form.doseIn && form.doseOut && (
            <div style={s.ratioBox}>
              Poměr: <b style={{ color: ACCENT }}>{ratio(form.doseIn, form.doseOut)}</b>{' '}
              <span style={{ color: '#666' }}>(ideál 1:2)</span>
            </div>
          )}

          <L t="Chuť" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TASTES.map(t => (
              <button
                key={t}
                onClick={() => tag(t)}
                style={{
                  ...s.chip,
                  background: form.taste.includes(t) ? ACCENT : '#1a1a1a',
                  color: form.taste.includes(t) ? '#1a1a1a' : '#888',
                  borderColor: form.taste.includes(t) ? ACCENT : '#333',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <L t="Hodnocení" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} style={s.starBtn} onClick={() => setForm(f => ({ ...f, rating: n }))}>
                <span style={{ fontSize: 32, color: n <= form.rating ? ACCENT : '#333' }}>★</span>
              </button>
            ))}
            <span style={{ color: '#666', fontSize: 13, marginLeft: 6 }}>{RLABEL[form.rating]}</span>
          </div>

          <button
            style={{ ...s.favBtn, color: form.fav ? ACCENT : '#666', borderColor: form.fav ? ACCENT : '#333' }}
            onClick={() => setForm(f => ({ ...f, fav: !f.fav }))}
          >
            {form.fav ? '★ Oblíbená' : '☆ Přidat k oblíbeným'}
          </button>

          <L t="Poznámky" />
          <textarea
            style={{ ...s.inp, minHeight: 70 }}
            placeholder="Co zlepšit?"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />

          <L t="Datum" />
          <input
            style={s.inp}
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />

          <button
            style={{ ...s.primary, opacity: form.name.trim() ? 1 : 0.4 }}
            onClick={submit}
          >
            {form.id ? '💾 Uložit' : '☕ Přidat'}
          </button>
        </div>
      )}

      {/* DETAIL */}
      {view === 'detail' && sel && (() => {
        const e = entries.find(x => x.id === sel.id) ?? sel;
        return (
          <div style={s.pad}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
                {FLAG[e.origin] ?? '🫘'} {e.name}
              </div>
              <button
                style={{ ...s.back, fontSize: 18, color: e.fav ? ACCENT : '#555' }}
                onClick={() => toggleFav(e.id)}
              >
                {e.fav ? '★' : '☆'}
              </button>
            </div>
            <div style={{ margin: '8px 0 16px' }}>
              <Stars n={e.rating} size={20} />
              <span style={{ fontSize: 12, color: '#555', marginLeft: 8 }}>{e.date}</span>
            </div>
            <div style={s.grid2}>
              <D l="Původ" v={`${FLAG[e.origin] ?? ''} ${e.origin || '—'}`} />
              <D l="Pražba" v={e.roast} />
              <D l="Hrubost" v={e.grind || '—'} hi />
              <D l="Čas" v={e.time ? e.time + ' s' : '—'} hi />
              <D l="Dávka" v={`${e.doseIn || '?'} → ${e.doseOut || '?'} g`} />
              <D l="Poměr" v={ratio(e.doseIn, e.doseOut)} />
              <D l="Košíček" v={e.basket} />
              <D l="Datum" v={e.date} />
            </div>
            {e.taste.length > 0 && (
              <>
                <L t="Chuť" />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {e.taste.map(t => <span key={t} style={s.tagLabel}>{t}</span>)}
                </div>
              </>
            )}
            {e.notes && (
              <>
                <L t="Poznámky" />
                <div style={s.notes}>{e.notes}</div>
              </>
            )}
            <button style={s.primary} onClick={() => dup(e)}>🔁 Uvařit znovu</button>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button style={{ ...s.out, flex: 1 }} onClick={() => { setForm(e); setView('form'); }}>✏️ Upravit</button>
              <button style={{ ...s.out, flex: 1, color: '#c04040', borderColor: '#5a2a2a' }} onClick={() => setDel(e)}>🗑️ Smazat</button>
            </div>
          </div>
        );
      })()}

      {view === 'list' && (
        <button style={s.fab} onClick={() => { setForm({ ...EMPTY }); setView('form'); }}>+</button>
      )}

      {/* DELETE CONFIRM */}
      {del && (
        <div style={s.overlay} onClick={() => setDel(null)}>
          <div style={s.modal} onClick={ev => ev.stopPropagation()}>
            <div style={{ fontSize: 26 }}>🗑️</div>
            <div style={{ color: '#fff', fontWeight: 700, margin: '8px 0 4px' }}>Smazat záznam?</div>
            <div style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>„{del.name}" bude odstraněn.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...s.out, flex: 1 }} onClick={() => setDel(null)}>Zrušit</button>
              <button
                style={{ ...s.primary, flex: 1, marginTop: 0, background: '#c04040', color: '#fff' }}
                onClick={() => remove(del.id)}
              >
                Smazat
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );
}

function StatsView({ entries }: { entries: CoffeeEntry[] }) {
  if (!entries.length) {
    return (
      <div style={s.empty}>
        <div style={{ fontSize: 40 }}>📊</div>
        <div style={{ marginTop: 8 }}>Přidej záznamy</div>
      </div>
    );
  }

  const best = [...entries].sort((a, b) => b.rating - a.rating)[0];
  const oc: Record<string, number> = {};
  entries.forEach(e => { if (e.origin) oc[e.origin] = (oc[e.origin] ?? 0) + 1; });
  const origins = Object.entries(oc).sort((a, b) => b[1] - a[1]);
  const max = origins.length ? origins[0][1] : 1;

  return (
    <div style={s.pad}>
      <div style={s.h2}>📊 Statistiky</div>
      {best.rating > 0 && (
        <div style={s.best}>
          <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 1 }}>🏆 NEJLEPŠÍ KÁVA</div>
          <div style={{ fontSize: 16, color: '#fff', fontWeight: 700, marginTop: 6 }}>
            {FLAG[best.origin] ?? '🫘'} {best.name}
          </div>
          <Stars n={best.rating} />
          <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
            Hrubost {best.grind || '—'} · {best.doseIn || '?'}→{best.doseOut || '?'}g · {best.time || '?'}s
          </div>
        </div>
      )}
      {origins.length > 0 && (
        <>
          <L t="Podle původu" />
          {origins.map(([n, c]) => (
            <div key={n} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#bbb', marginBottom: 3 }}>
                <span>{FLAG[n] ?? '🫘'} {n}</span>
                <span>{c}×</span>
              </div>
              <div style={s.track}>
                <div style={{ ...s.fill, width: `${(c / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Stars({ n, size = 15 }: { n: number; size?: number }) {
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: size, color: i <= n ? ACCENT : '#333' }}>★</span>
      ))}
    </span>
  );
}

function Stat({ v, l }: { v: number | string; l: string }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 18, color: ACCENT, fontWeight: 700 }}>{v}</div>
      <div style={{ fontSize: 10, color: '#666' }}>{l}</div>
    </div>
  );
}

function L({ t }: { t: string }) {
  return (
    <div style={{
      fontSize: 11, color: ACCENT, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: 1, margin: '16px 0 8px', borderBottom: '1px solid #222', paddingBottom: 4,
    }}>
      {t}
    </div>
  );
}

function D({ l, v, hi }: { l: string; v: string; hi?: boolean }) {
  return (
    <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase' }}>{l}</div>
      <div style={{ color: hi ? ACCENT : '#ddd', fontWeight: hi ? 700 : 400, fontSize: hi ? 16 : 14 }}>{v}</div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root:     { background: '#0f0f0f', minHeight: '100vh', fontFamily: 'Helvetica, Arial, sans-serif', color: '#ddd', paddingBottom: 80 },
  head:     { background: '#161616', borderBottom: '1px solid #2a2a2a', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 10 },
  title:    { fontSize: 16, fontWeight: 700, color: ACCENT },
  sub:      { fontSize: 11, color: '#555' },
  back:     { background: '#222', border: '1px solid #333', color: '#ccc', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16 },
  pad:      { padding: 16, maxWidth: 600, margin: '0 auto' },
  h2:       { fontSize: 18, fontWeight: 700, color: ACCENT, marginBottom: 12 },
  inp:      { width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#ddd', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  statRow:  { display: 'flex', alignItems: 'center', gap: 8, background: '#141414', border: '1px solid #222', borderRadius: 10, padding: '10px', margin: '12px 0' },
  statsBtn: { background: '#1c1c1c', border: '1px solid #333', borderRadius: 8, width: 38, height: 38, fontSize: 16, cursor: 'pointer' },
  card:     { background: '#161616', border: '1px solid #252525', borderRadius: 12, padding: 14, cursor: 'pointer', marginTop: 12 },
  empty:    { textAlign: 'center', padding: '50px 20px', color: '#888' },
  grid2:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 },
  grid3:    { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 },
  ratioBox: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#888', marginTop: 8 },
  chip:     { padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '1px solid', fontFamily: 'inherit' },
  starBtn:  { background: 'none', border: 'none', cursor: 'pointer', padding: 2 },
  favBtn:   { marginTop: 12, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  tagLabel: { background: '#1e1e1e', color: ACCENT, padding: '4px 10px', borderRadius: 6, fontSize: 13, border: '1px solid #3a2a1a' },
  notes:    { background: '#161616', border: '1px solid #222', borderRadius: 8, padding: 12, fontSize: 14, color: '#aaa', lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  primary:  { width: '100%', background: ACCENT, color: '#1a1a1a', border: 'none', borderRadius: 8, padding: 13, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', marginTop: 20 },
  out:      { background: 'transparent', color: '#aaa', border: '1px solid #333', borderRadius: 8, padding: 12, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' },
  fab:      { position: 'fixed', right: 20, bottom: 24, width: 56, height: 56, borderRadius: '50%', background: ACCENT, color: '#1a1a1a', border: 'none', fontSize: 30, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,.5)', zIndex: 20 },
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, padding: 20 },
  modal:    { background: '#1a1a1a', border: '1px solid #333', borderRadius: 16, padding: 24, maxWidth: 320, width: '100%', textAlign: 'center' },
  toast:    { position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#2a2a2a', color: '#fff', padding: '10px 18px', borderRadius: 24, fontSize: 13, zIndex: 40, border: `1px solid ${ACCENT}` },
  best:     { background: '#1d160d', border: '1px solid #3a2a1a', borderRadius: 12, padding: 16, marginBottom: 8 },
  track:    { background: '#1a1a1a', borderRadius: 4, height: 8, overflow: 'hidden' },
  fill:     { background: ACCENT, height: '100%', borderRadius: 4 },
};
