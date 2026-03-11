import { useContext, useState } from 'react';
import { AppContext } from '../App';
import { T, Card, SectionTitle, ProgressBar } from '../components/UI';
import { SUPPLEMENTS, SUPPLEMENT_CATEGORIES } from '../constants/supplements';
import { useSupplements } from '../hooks/useSupplements';

// ─── Supplement Card ──────────────────────────────────────────
function SupplementCard({
  supp,
  taken,
  dose,
  onToggle,
  onDoseChange,
}: {
  supp:        typeof SUPPLEMENTS[0];
  taken:       boolean;
  dose:        number;
  onToggle:    () => void;
  onDoseChange:(delta: number) => void;
}) {
  const stepMap: Record<string, number> = {
    mg: supp.defaultDose >= 1000 ? 200 : 50,
    g: 1,
    µg: supp.unit === 'µg' && supp.defaultDose >= 100 ? 100 : 0.5,
    IU: 500,
    tab: 1,
  };
  const step = stepMap[supp.unit] ?? 50;

  return (
    <div style={{
      background:   taken ? supp.color + '18' : T.card,
      border:       `1px solid ${taken ? supp.color + '55' : T.border}`,
      borderRadius: 12,
      padding:      14,
      marginBottom: 10,
      transition:   'all 0.2s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{supp.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: taken ? supp.color : T.text }}>
            {supp.name}
          </div>
          <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.3 }}>{supp.description}</div>
        </div>
        {/* Toggle button */}
        <button
          onClick={onToggle}
          style={{
            width:        36,
            height:       36,
            borderRadius: 10,
            border:       `1.5px solid ${taken ? supp.color : T.border}`,
            background:   taken ? supp.color : 'transparent',
            color:        taken ? '#fff' : T.muted,
            fontSize:     18,
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            flexShrink:   0,
            transition:   'all 0.15s',
          }}
          aria-label={taken ? 'Označit jako nevzaté' : 'Označit jako vzaté'}
        >
          {taken ? '✓' : '○'}
        </button>
      </div>

      {/* Dose row */}
      <div style={{
        display:     'flex',
        alignItems:  'center',
        gap:         8,
        background:  T.border + '55',
        borderRadius: 8,
        padding:     '6px 10px',
      }}>
        <span style={{ fontSize: 11, color: T.muted, flex: 1 }}>
          ⏰ {supp.timing}
        </span>
        <button
          onClick={() => onDoseChange(-step)}
          style={{
            width: 26, height: 26, borderRadius: 6,
            background: T.border, border: 'none',
            color: T.text, fontSize: 16, cursor: 'pointer',
          }}
        >−</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: supp.color, minWidth: 60, textAlign: 'center' }}>
          {dose} {supp.unit}
        </span>
        <button
          onClick={() => onDoseChange(+step)}
          style={{
            width: 26, height: 26, borderRadius: 6,
            background: supp.color + '22', border: `1px solid ${supp.color}44`,
            color: supp.color, fontSize: 16, cursor: 'pointer',
          }}
        >+</button>
      </div>
    </div>
  );
}

// ─── Supplements page ────────────────────────────────────────
export default function Supplements() {
  const { accent, userId, today } = useContext(AppContext);
  const {
    toggle, setDose, isTaken, getDose, takenCount,
  } = useSupplements(userId, today);

  const [activeCategory, setActiveCategory] = useState<string>('Vše');

  const categories = ['Vše', ...SUPPLEMENT_CATEGORIES];
  const filtered = activeCategory === 'Vše'
    ? SUPPLEMENTS
    : SUPPLEMENTS.filter(s => s.category === activeCategory);

  const totalSupplements = SUPPLEMENTS.length;

  const handleToggle = async (s: typeof SUPPLEMENTS[0]) => {
    await toggle(s.id, s.name, getDose(s.id, s.defaultDose), s.unit);
  };

  const handleDoseChange = async (s: typeof SUPPLEMENTS[0], delta: number) => {
    const current = getDose(s.id, s.defaultDose);
    const min = s.unit === 'tab' ? 1 : 0;
    const newDose = Math.max(min, current + delta);
    await setDose(s.id, s.name, newDose, s.unit);
  };

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <SectionTitle accent={accent}>Doplňky stravy</SectionTitle>

      {/* Progress card */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: accent }}>
              {takenCount}
              <span style={{ fontSize: 16, fontWeight: 400, color: T.muted }}>
                {' '}/ {totalSupplements}
              </span>
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>vzato dnes</div>
          </div>
          <div style={{ fontSize: 32 }}>
            {takenCount === 0 ? '💊' : takenCount >= totalSupplements * 0.7 ? '🏆' : '✅'}
          </div>
        </div>
        <ProgressBar value={takenCount} max={totalSupplements} color={accent} height={6} />
        {takenCount > 0 && (
          <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
            {Math.round((takenCount / totalSupplements) * 100)} % splněno dnes
          </div>
        )}
      </Card>

      {/* Category filter */}
      <div style={{
        display:   'flex',
        gap:       6,
        overflowX: 'auto',
        marginBottom: 14,
        paddingBottom: 4,
        scrollbarWidth: 'none',
      }}>
        {categories.map(cat => {
          const isActive = cat === activeCategory;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink:   0,
                padding:      '5px 12px',
                borderRadius: 20,
                border:       `1px solid ${isActive ? accent : T.border}`,
                background:   isActive ? accent + '22' : 'transparent',
                color:        isActive ? accent : T.muted,
                fontSize:     12,
                fontWeight:   isActive ? 600 : 400,
                cursor:       'pointer',
                transition:   'all 0.15s',
                whiteSpace:   'nowrap',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Supplement list by category */}
      {(activeCategory === 'Vše' ? [...SUPPLEMENT_CATEGORIES] : [activeCategory]).map(cat => {
        const items = filtered.filter(s => s.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            <div style={{
              fontSize:      11,
              color:         T.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              fontWeight:    600,
              marginBottom:  8,
              marginTop:     4,
            }}>
              {cat}
            </div>
            {items.map(s => (
              <SupplementCard
                key={s.id}
                supp={s}
                taken={isTaken(s.id)}
                dose={getDose(s.id, s.defaultDose)}
                onToggle={() => handleToggle(s)}
                onDoseChange={delta => handleDoseChange(s, delta)}
              />
            ))}
          </div>
        );
      })}

      {/* Info card */}
      <Card style={{ marginBottom: 16, background: accent + '0d', borderColor: accent + '33' }}>
        <div style={{ fontSize: 12, color: accent, fontWeight: 600, marginBottom: 4 }}>
          💡 Tipy pro suplementaci
        </div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
          Vitamín D3 a omega-3 se lépe vstřebávají s jídlem obsahujícím tuk.
          Kreatin zlepšuje výkon po 2–4 týdnech pravidelného užívání.
          Hořčík večer napomáhá lepšímu spánku a svalové regeneraci.
        </div>
      </Card>

    </div>
  );
}
