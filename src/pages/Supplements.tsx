import { useContext, useState } from 'react';
import { AppContext } from '../App';
import { T, BRAND, ProgressBar } from '../components/UI';
import { SUPPLEMENTS, SUPPLEMENT_CATEGORIES } from '../constants/supplements';
import { useSupplements } from '../hooks/useSupplements';

function SupplementItem({
  supp, taken, dose, onToggle, onDoseChange,
}: {
  supp:         typeof SUPPLEMENTS[0];
  taken:        boolean;
  dose:         number;
  onToggle:     () => void;
  onDoseChange: (delta: number) => void;
}) {
  const stepMap: Record<string, number> = {
    mg: supp.defaultDose >= 1000 ? 200 : 50,
    g: 1, µg: supp.unit === 'µg' && supp.defaultDose >= 100 ? 100 : 0.5,
    IU: 500, tab: 1,
  };
  const step = stepMap[supp.unit] ?? 50;

  return (
    <div style={{
      background:   taken ? 'linear-gradient(135deg, rgba(0,229,176,0.04), #0d0d0d)' : T.card,
      border:       `1px solid ${taken ? 'rgba(0,229,176,0.2)' : T.border}`,
      borderRadius: 14,
      padding:      '12px 14px',
      marginBottom: 8,
      display:      'flex',
      alignItems:   'center',
      gap:          12,
      transition:   'all 0.2s',
      cursor:       'pointer',
    }}
    onClick={onToggle}
    >
      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: supp.color + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>
        {supp.icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: taken ? BRAND.green : T.text, marginBottom: 2 }}>
          {supp.name}
        </div>
        <div style={{ fontSize: 11, color: T.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: supp.color, fontWeight: 600 }}>{dose} {supp.unit}</span>
          <span>·</span>
          <span>⏰ {supp.timing}</span>
        </div>
      </div>

      {/* Dose adjust */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onDoseChange(-step)}
          style={{
            width: 26, height: 26, borderRadius: 6,
            background: T.border, border: 'none',
            color: T.text, fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >−</button>
        <button
          onClick={() => onDoseChange(+step)}
          style={{
            width: 26, height: 26, borderRadius: 6,
            background: supp.color + '22', border: `1px solid ${supp.color}44`,
            color: supp.color, fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >+</button>
      </div>

      {/* Checkbox */}
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        border: `2px solid ${taken ? BRAND.green : '#2a2a2a'}`,
        background: taken ? BRAND.green : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}>
        {taken && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>
    </div>
  );
}

export default function Supplements() {
  const { accent, userId, today } = useContext(AppContext);
  const { toggle, setDose, isTaken, getDose, takenCount } = useSupplements(userId, today);

  const [activeCategory, setActiveCategory] = useState<string>('Vše');

  const categories = ['Vše', ...SUPPLEMENT_CATEGORIES];
  const filtered = activeCategory === 'Vše'
    ? SUPPLEMENTS
    : SUPPLEMENTS.filter(s => s.category === activeCategory);

  const totalSupplements = SUPPLEMENTS.length;
  const pct = totalSupplements > 0 ? Math.round((takenCount / totalSupplements) * 100) : 0;

  const handleToggle  = async (s: typeof SUPPLEMENTS[0]) => toggle(s.id, s.name, getDose(s.id, s.defaultDose), s.unit);
  const handleDoseChg = async (s: typeof SUPPLEMENTS[0], delta: number) => {
    const current = getDose(s.id, s.defaultDose);
    const min = s.unit === 'tab' ? 1 : 0;
    await setDose(s.id, s.name, Math.max(min, current + delta), s.unit);
  };

  return (
    <div style={{ padding: '16px 16px 0', position: 'relative' }}>
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 300,
        background: 'radial-gradient(ellipse at top, rgba(255,214,0,0.06), transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Hero progress card */}
        <div className="stagger-1" style={{
          background: 'linear-gradient(180deg, #0f0f0f, #080808)',
          border: '1px solid #181818',
          borderRadius: 22, padding: '20px 20px 16px',
          marginBottom: 16, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
            background: 'radial-gradient(circle at center, rgba(255,214,0,0.03) 0%, transparent 40%)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 9, color: T.muted, letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginBottom: 6, fontWeight: 600 }}>
                Doplňky stravy
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{
                  fontSize: 44, fontWeight: 800, letterSpacing: '-2px', lineHeight: 1,
                  background: 'linear-gradient(180deg, #fff 40%, #888)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent', fontVariantNumeric: 'tabular-nums',
                }}>
                  {takenCount}
                </span>
                <span style={{ fontSize: 18, color: T.muted, fontWeight: 400 }}>/ {totalSupplements}</span>
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>vzato dnes</div>
            </div>
            <div style={{ fontSize: 36 }}>
              {takenCount === 0 ? '💊' : pct >= 70 ? '🏆' : '✅'}
            </div>
          </div>
          <ProgressBar value={takenCount} max={totalSupplements} color={BRAND.green} height={5} />
          {takenCount > 0 && (
            <div style={{ fontSize: 11, color: BRAND.green, marginTop: 8, fontWeight: 600 }}>
              {pct}% splněno dnes
            </div>
          )}
        </div>

        {/* Category filter chips */}
        <div className="stagger-2" style={{
          display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14,
          paddingBottom: 4, scrollbarWidth: 'none',
        }}>
          {categories.map(cat => {
            const isActive = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  flexShrink: 0, padding: '5px 12px', borderRadius: 20,
                  border: `1px solid ${isActive ? 'rgba(255,214,0,0.3)' : T.border}`,
                  background: isActive ? 'rgba(255,214,0,0.1)' : 'transparent',
                  color: isActive ? BRAND.gold : T.muted,
                  fontSize: 11, fontWeight: isActive ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.15s',
                  whiteSpace: 'nowrap', letterSpacing: '0.5px',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Supplement list */}
        <div className="stagger-3">
          {(activeCategory === 'Vše' ? [...SUPPLEMENT_CATEGORIES] : [activeCategory]).map(cat => {
            const items = filtered.filter(s => s.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <div style={{
                  fontSize: 10, color: T.muted, textTransform: 'uppercase' as const,
                  letterSpacing: '1.5px', fontWeight: 700, marginBottom: 8, marginTop: 4,
                }}>
                  {cat}
                </div>
                {items.map(s => (
                  <SupplementItem
                    key={s.id}
                    supp={s}
                    taken={isTaken(s.id)}
                    dose={getDose(s.id, s.defaultDose)}
                    onToggle={() => handleToggle(s)}
                    onDoseChange={delta => handleDoseChg(s, delta)}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Tip card */}
        <div style={{
          background: 'linear-gradient(135deg, #0f0f0f, #0a0a0a)',
          border: `1px solid ${accent}33`,
          borderRadius: 16, padding: 16, marginBottom: 16, marginTop: 8,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(135deg, ${accent}08, transparent)`,
            pointerEvents: 'none',
          }} />
          <div style={{ fontSize: 10, color: accent, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginBottom: 8 }}>
            ◆ Tip k suplementaci
          </div>
          <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
            Vitamín D3 a omega-3 se lépe vstřebávají s jídlem obsahujícím tuk.
            Kreatin zlepšuje výkon po 2–4 týdnech pravidelného užívání.
            Hořčík večer napomáhá lepšímu spánku a svalové regeneraci.
          </div>
        </div>

      </div>
    </div>
  );
}
