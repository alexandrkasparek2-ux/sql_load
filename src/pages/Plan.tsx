import { useContext, useState, useEffect } from 'react';
import { AppContext }   from '../App';
import { T, Card, SectionTitle, Btn } from '../components/UI';
import {
  TRAINING_TYPES, MEAL_SLOTS, calcCaloriesMulti, calcMacros, calcWater,
  primaryType, INTENSITY_MUL, type TrainingType,
} from '../constants/training';
import type { ActivityIntensity } from '../hooks/useTrainingDay';

// ─── Stretching data ─────────────────────────────────────────
interface Stretch { name: string; duration: string; desc: string; }

const STRETCHES: Record<string, Stretch[]> = {
  cycling: [
    { name: 'Kvadricepsy', duration: '30s každá noha', desc: 'Stoj, ohni koleno, drž kotník za zády. Kyčle vpřed.' },
    { name: 'Hamstringy', duration: '40s', desc: 'Sed, nohy rovně, předklon s rovnými zády. Sahej na špičky.' },
    { name: 'Lýtka', duration: '30s každá noha', desc: 'Opři se o zeď, zadní noha rovně, pata na zemi.' },
    { name: 'Kyčelní flexory', duration: '40s každá noha', desc: 'Výpad vpřed, zadní koleno na zemi. Tlač kyčle vpřed.' },
    { name: 'Záda & hrudník', duration: '30s', desc: 'Propojené ruce za zády, ruce stlač dolů, hrudník otevři.' },
    { name: 'Krk & trapézy', duration: '20s každá strana', desc: 'Skloň hlavu do strany, rukou mírně přitlač. Uvolni ramena.' },
  ],
  cycling_indoor: [
    { name: 'Kvadricepsy', duration: '30s každá noha', desc: 'Stoj, ohni koleno, drž kotník za zády.' },
    { name: 'Hamstringy', duration: '40s', desc: 'Sed, nohy rovně, předklon s rovnými zády.' },
    { name: 'Kyčelní flexory', duration: '40s každá noha', desc: 'Výpad vpřed, zadní koleno na zemi, tlač kyčle vpřed.' },
    { name: 'Lýtka', duration: '30s každá noha', desc: 'Opři se o zeď, zadní noha rovně, pata na zemi.' },
    { name: 'Bederní záda', duration: '30s', desc: 'Leh na záda, přitáhni obě kolena k hrudníku.' },
  ],
  running: [
    { name: 'Hamstringy', duration: '40s každá noha', desc: 'Stoj, jednu nohu natáhni před sebe na podložku, lehce předkloň.' },
    { name: 'Kvadricepsy', duration: '30s každá noha', desc: 'Stoj, ohni koleno, drž kotník za zády.' },
    { name: 'Lýtka & Achillova šlacha', duration: '30s každá noha', desc: 'Opři se o zeď, pata pevně na zemi. Pak pokrč koleno pro Achillovku.' },
    { name: 'IT pásmo', duration: '30s každá noha', desc: 'Zkřiž nohy, předkloň se k přední noze.' },
    { name: 'Kyčelní flexory', duration: '40s každá noha', desc: 'Hluboký výpad, koleno na zemi, tlač boky vpřed.' },
    { name: 'Hýžďové svaly', duration: '30s každá noha', desc: 'Leh na záda, pokrč koleno přes druhou nohu do tvaru "4".' },
  ],
  strength: [
    { name: 'Hrudník & ramena', duration: '30s', desc: 'Paže za záda, propojené ruce, ruce stlač dolů a otevři hrudník.' },
    { name: 'Triceps', duration: '20s každá ruka', desc: 'Zvedni ruku nad hlavu, ohni loktem, druhou rukou mírně přitlač.' },
    { name: 'Záda — cat-cow', duration: '30s / 10 opakování', desc: 'Klečmo na čtyřech, střídej prohnutí a vyhrbení zad.' },
    { name: 'Hýžďové svaly', duration: '30s každá noha', desc: 'Leh, pokrč koleno přes druhou nohu, přitáhni k hrudníku.' },
    { name: 'Kyčelní flexory', duration: '40s každá noha', desc: 'Hluboký výpad, koleno na zemi, tlač boky vpřed.' },
    { name: 'Předloktí', duration: '20s každá ruka', desc: 'Nataž ruku dlaní nahoru, druhou rukou přitáhni prsty dolů.' },
  ],
  swimming: [
    { name: 'Ramena — cross-body', duration: '20s každé', desc: 'Nataž ruku přes tělo, druhou rukou přitáhni k hrudníku.' },
    { name: 'Hrudník u zdi', duration: '30s každá strana', desc: 'Dlaň na zeď, otoč tělo od ní. Cítiš protažení hrudníku.' },
    { name: 'Triceps', duration: '20s každý', desc: 'Ruka za hlavu, loktem nahoru, druhou rukou mírně přitlač.' },
    { name: 'Boky — rotace', duration: '30s každá strana', desc: 'Sed, přehoď nohu přes druhou, otoč trup na stranu pokrčené nohy.' },
    { name: 'Záda & bederní oblast', duration: '30s', desc: 'Leh na záda, přitáhni obě kolena k hrudníku, kývej mírně do stran.' },
  ],
  yoga: [
    { name: 'Dětská pozice', duration: '60s', desc: 'Klečmo, sed na paty, ruce natáhni vpřed, čelo na zem.' },
    { name: 'Holubí pozice', duration: '45s každá strana', desc: 'Jedno koleno vpřed za rukama, druhá noha rovně vzadu.' },
    { name: 'Kobra', duration: '30s', desc: 'Leh na břicho, vzepři se na dlaně, zvedni hrudník. Lokty mírně pokrčeny.' },
  ],
  hiking: [
    { name: 'Lýtka', duration: '30s každá noha', desc: 'Opři se o zeď nebo strom, pata pevně na zemi.' },
    { name: 'Hamstringy', duration: '40s', desc: 'Sed, nohy rovně, předklon s rovnými zády.' },
    { name: 'Kvadricepsy', duration: '30s každá noha', desc: 'Stoj (opři se), ohni koleno, drž kotník.' },
    { name: 'Kotníky', duration: '20s každý', desc: 'Krouž kotníkem po kruhu oběma směry.' },
  ],
  team_sport: [
    { name: 'Třísla', duration: '30s', desc: 'Sed, chodidla k sobě (motýlek), mírně tlač kolena k zemi.' },
    { name: 'Hamstringy', duration: '40s každá noha', desc: 'Stoj, jednu nohu polož na nízkou podložku, předkloň.' },
    { name: 'Kyčle — pigeon', duration: '40s každá noha', desc: 'Z kleku přesuň jedno koleno za ruku, zadní noha rovně.' },
    { name: 'Lýtka', duration: '30s každá noha', desc: 'Opři se, pata na zemi, noha rovně.' },
  ],
  boxing: [
    { name: 'Ramena — overhead', duration: '30s každé', desc: 'Zvedni loket nad hlavu, druhou rukou mírně přitlač.' },
    { name: 'Krk', duration: '20s každá strana', desc: 'Skloň hlavu do strany, rukou jemně přidej váhu.' },
    { name: 'Hrudník u zdi', duration: '30s každá strana', desc: 'Dlaň na zeď, otoč tělo pryč od ní.' },
    { name: 'Kyčelní flexory', duration: '40s každá noha', desc: 'Výpad vpřed, koleno na zemi, boky vpřed.' },
    { name: 'Záda — rotace', duration: '30s každá strana', desc: 'Sed, pokrč nohu přes druhou, otoč trup ke kolenu.' },
  ],
  walking: [
    { name: 'Lýtka', duration: '30s každá noha', desc: 'Opři se o zeď, pata na zemi.' },
    { name: 'Třísla', duration: '30s', desc: 'Sed, chodidla k sobě, mírně tlač kolena dolů.' },
  ],
  dancing: [
    { name: 'Třísla & vnitřní stehna', duration: '30s', desc: 'Sed, chodidla k sobě, tlač kolena k zemi.' },
    { name: 'Kyčle — boční', duration: '30s každá strana', desc: 'Výpad do strany, druhá noha rovně. Tlač boky dolů.' },
    { name: 'Záda & boky', duration: '30s každá strana', desc: 'Sed, pokrč nohu přes druhou, otoč trup.' },
  ],
  skiing: [
    { name: 'Kvadricepsy', duration: '30s každá noha', desc: 'Stoj, ohni koleno, drž kotník za zády.' },
    { name: 'Třísla', duration: '30s', desc: 'Sed, chodidla k sobě, mírně tlač kolena dolů.' },
    { name: 'Lýtka', duration: '30s každá noha', desc: 'Opři se o zeď, pata na zemi, noha rovně.' },
    { name: 'Záda — cat-cow', duration: '10 opakování', desc: 'Klečmo, střídej prohnutí a vyhrbení zad.' },
  ],
  rest: [],
};

function getStretches(types: TrainingType[]): Stretch[] {
  const seen = new Set<string>();
  const result: Stretch[] = [];
  for (const t of types) {
    const base = t.replace(/_hard|_medium|_light|_easy/g, '');
    const key = Object.keys(STRETCHES).find(k => base.startsWith(k) || base.includes(k)) ?? 'cycling';
    for (const s of (STRETCHES[key] ?? [])) {
      if (!seen.has(s.name)) { seen.add(s.name); result.push(s); }
    }
  }
  return result.slice(0, 8); // max 8 exercises
}

function StretchingModal({ types, accent, onClose }: { types: TrainingType[]; accent: string; onClose: () => void }) {
  const stretches = getStretches(types);
  if (!stretches.length) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: T.card, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '88dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🧘</span>
            <div>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: T.text, fontSize: 16 }}>Strečink po tréninku</div>
              <div style={{ fontSize: 12, color: T.muted }}>Doporučeno pro tvoje aktivity · {stretches.length} cviků</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 24, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stretches.map((s, i) => (
            <div key={i} style={{ background: T.bg, borderRadius: 14, padding: '14px 16px', border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', background: accent + '22',
                    color: accent, fontSize: 12, fontWeight: 700, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Syne,sans-serif',
                  }}>{i + 1}</div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{s.name}</span>
                </div>
                <span style={{ fontSize: 11, color: accent, background: accent + '18', padding: '3px 8px', borderRadius: 20, flexShrink: 0, marginLeft: 8 }}>
                  ⏱ {s.duration}
                </span>
              </div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5, paddingLeft: 34 }}>{s.desc}</div>
            </div>
          ))}

          <div style={{ background: accent + '10', border: `1px solid ${accent}30`, borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
            <span style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
              Strečink dělej pomalu a plynule. Každý cvik drž bez trhání. Dýchej rovnoměrně — při výdechu se hlouběji protáhni.
            </span>
          </div>

          <button
            onClick={onClose}
            style={{ padding: '14px 0', borderRadius: 14, border: 'none', background: accent, color: '#000', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4 }}
          >
            ✓ Hotovo
          </button>
        </div>
      </div>
    </div>
  );
}

// Suggested meal % distributions by training type
const DISTRIBUTIONS: Record<string, Record<string, number>> = {
  rest:       { snidane: 25, dop_svacina: 10, obed: 30, odp_svacina: 10, vecere: 25 },
  light:      { snidane: 20, dop_svacina: 10, obed: 25, odp_svacina: 10, pred_tren: 10, behem_tren:  5, po_tren: 10, vecere: 10 },
  medium:     { snidane: 20, dop_svacina: 10, obed: 20, odp_svacina: 10, pred_tren: 10, behem_tren: 10, po_tren: 10, vecere: 10 },
  hard:       { snidane: 20, dop_svacina: 10, obed: 15, odp_svacina: 10, pred_tren: 10, behem_tren: 15, po_tren: 10, vecere: 10 },
  race:       { snidane: 20, dop_svacina: 10, obed: 10, odp_svacina:  5, pred_tren: 10, behem_tren: 20, po_tren: 15, vecere: 10 },
  strength:       { snidane: 25, obed: 30, pred_tren: 15, po_tren: 20, vecere: 10 },
  running:        { snidane: 20, obed: 25, pred_tren: 15, po_tren: 20, vecere: 20 },
  swimming:       { snidane: 20, obed: 25, pred_tren: 15, po_tren: 20, vecere: 20 },
  team_sport:     { snidane: 25, obed: 25, pred_tren: 15, po_tren: 15, vecere: 20 },
  yoga:           { snidane: 25, dop_svacina: 10, obed: 30, odp_svacina: 10, vecere: 25 },
  walking:        { snidane: 25, dop_svacina: 10, obed: 30, odp_svacina: 10, vecere: 25 },
  hiking:         { snidane: 25, dop_svacina: 15, obed: 30, odp_svacina: 15, vecere: 15 },
  cycling_indoor: { snidane: 20, obed: 25, pred_tren: 15, po_tren: 20, vecere: 20 },
  dancing:        { snidane: 20, dop_svacina: 10, obed: 30, odp_svacina: 10, vecere: 30 },
  skiing:         { snidane: 25, dop_svacina: 15, obed: 30, odp_svacina: 15, vecere: 15 },
  boxing:         { snidane: 20, obed: 25, pred_tren: 15, po_tren: 20, vecere: 20 },
};

const INTENSITIES: { id: ActivityIntensity; label: string; color: string }[] = [
  { id: 'low',    label: 'Lehká',   color: '#22c55e' },
  { id: 'medium', label: 'Střední', color: '#f59e0b' },
  { id: 'high',   label: 'Tvrdá',   color: '#ef4444' },
];

function initSelected(trainingType: TrainingType, extraTypes: TrainingType[]): Set<TrainingType> {
  if (extraTypes.length > 0) return new Set(extraTypes);
  return new Set([trainingType]);
}

export default function Plan() {
  const ctx = useContext(AppContext);
  const { accent, trainingDay, upsertTrainingDay, profile } = ctx;

  const savedPrimary    = trainingDay?.training_type    ?? 'rest';
  const savedExtra      = trainingDay?.extra_types      ?? [];
  const savedActHours   = trainingDay?.activity_hours   ?? {};
  const savedActIntens  = trainingDay?.activity_intensity ?? {};

  const [selected,       setSelected]       = useState<Set<TrainingType>>(() => initSelected(savedPrimary, savedExtra));
  const [actHours,       setActHours]       = useState<Record<string, number>>(savedActHours);
  const [actIntens,      setActIntens]      = useState<Record<string, ActivityIntensity>>(savedActIntens as Record<string, ActivityIntensity>);
  const [saving,         setSaving]         = useState(false);
  const [showStretching, setShowStretching] = useState(false);

  useEffect(() => {
    setSelected(initSelected(
      trainingDay?.training_type ?? 'rest',
      trainingDay?.extra_types   ?? [],
    ));
    setActHours(trainingDay?.activity_hours ?? {});
    setActIntens((trainingDay?.activity_intensity ?? {}) as Record<string, ActivityIntensity>);
  }, [trainingDay?.training_type, trainingDay?.extra_types, trainingDay?.activity_hours, trainingDay?.activity_intensity]);

  const toggle = (id: TrainingType) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (id === 'rest') return new Set<TrainingType>(['rest']);
      next.delete('rest');
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) next.add('rest');
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const changeHours = (type: TrainingType, delta: number) => {
    setActHours(prev => ({
      ...prev,
      [type]: Math.max(0, Math.min(12, parseFloat(((prev[type] ?? 0) + delta).toFixed(1)))),
    }));
  };

  const setIntensity = (type: TrainingType, val: ActivityIntensity) => {
    setActIntens(prev => ({ ...prev, [type]: val }));
  };

  const saveAll = async () => {
    const types = Array.from(selected) as TrainingType[];
    const prime = primaryType(types);
    // Only persist hours for currently selected activities — prevents stale
    // hours from deselected activities inflating the calorie calculation.
    const filteredHours: Record<string, number> = {};
    types.forEach(t => { filteredHours[t] = actHours[t] ?? 0; });
    const totalH = Object.values(filteredHours).reduce((s, h) => s + h, 0);
    setSaving(true);
    await upsertTrainingDay({
      training_type:      prime,
      extra_types:        types,
      activity_hours:     filteredHours,
      activity_intensity: actIntens,
      ride_hours:         totalH,
    });
    setSaving(false);
    if (!selected.has('rest')) setShowStretching(true);
  };

  const selectedTypes   = Array.from(selected) as TrainingType[];
  const prime           = primaryType(selectedTypes);
  const primeCfg        = TRAINING_TYPES.find(t => t.id === prime)!;
  const mealDistrib     = DISTRIBUTIONS[prime] ?? {};

  const demoProfile = profile ?? { weight: 70, height: 175, age: 30, gender: 'male' as const };
  const totalHours  = Object.values(actHours).reduce((s, h) => s + h, 0);
  const kcalGoal    = calcCaloriesMulti(demoProfile, selectedTypes, actHours, actIntens);
  const macros      = calcMacros(demoProfile, prime);
  const water       = calcWater(demoProfile, totalHours);

  const cyclingTypes = TRAINING_TYPES.filter(t => t.category === 'cycling');
  const sportTypes   = TRAINING_TYPES.filter(t => t.category === 'sport');
  const hasActive    = !selected.has('rest');

  // isDirty: any unsaved change in selection, hours, or intensity
  const savedSelKey   = [...savedExtra.length ? savedExtra : [savedPrimary]].sort().join(',');
  const currentSelKey = selectedTypes.slice().sort().join(',');
  const isDirty = savedSelKey !== currentSelKey
    || JSON.stringify(savedActHours)  !== JSON.stringify(actHours)
    || JSON.stringify(savedActIntens) !== JSON.stringify(actIntens);

  return (
    <div style={{ padding: '16px 16px 0' }}>
      {showStretching && (
        <StretchingModal
          types={selectedTypes.filter(t => t !== 'rest')}
          accent={accent}
          onClose={() => setShowStretching(false)}
        />
      )}

      <div style={{ fontSize: 12, color: T.muted, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>💡</span>
        Vyber aktivity, nastav čas a intenzitu — kalorie se spočítají automaticky
      </div>

      {/* ── Cycling types ────────────────────────────── */}
      <SectionTitle accent={accent}>🚴 Cyklistika</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {cyclingTypes.map(t => (
          <TrainingCard
            key={t.id} t={t} selected={selected}
            hours={actHours[t.id] ?? 0}
            intensity={actIntens[t.id] ?? 'medium'}
            onToggle={toggle}
            onHoursChange={changeHours}
            onIntensityChange={setIntensity}
          />
        ))}
      </div>

      {/* ── Other sports ─────────────────────────────── */}
      <SectionTitle accent={accent}>🏅 Ostatní sporty</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {sportTypes.map(t => (
          <TrainingCard
            key={t.id} t={t} selected={selected}
            hours={actHours[t.id] ?? 0}
            intensity={actIntens[t.id] ?? 'medium'}
            onToggle={toggle}
            onHoursChange={changeHours}
            onIntensityChange={setIntensity}
          />
        ))}
      </div>

      {/* ── Save button ───────────────────────────────── */}
      {isDirty && (
        <div style={{ marginBottom: 20 }}>
          <Btn accent={primeCfg.color} size="md" full onClick={saveAll} disabled={saving}>
            {saving ? 'Ukládám…' : '💾 Uložit plán dne'}
          </Btn>
        </div>
      )}

      {/* ── Calculated targets ─────────────────────── */}
      <SectionTitle accent={accent}>Dnešní cíle</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        {hasActive && (
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, textAlign: 'center' }}>
            {selectedTypes.filter(t => t !== 'rest').map(id => {
              const cfg = TRAINING_TYPES.find(t => t.id === id)!;
              const h   = actHours[id] ?? 0;
              const lv  = actIntens[id] ?? 'medium';
              const mul = INTENSITY_MUL[lv];
              return (
                <span key={id} style={{ marginRight: 8 }}>
                  {cfg.icon} {h.toFixed(1)}h ×{mul}
                </span>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
          <GoalItem label="Kalorie"   value={Math.round(kcalGoal)} unit="kcal" color={accent}     />
          <GoalItem label="Sacharidy" value={macros.carbs}         unit="g"    color="#f59e0b"    />
          <GoalItem label="Bílkoviny" value={macros.protein}       unit="g"    color="#22c55e"    />
          <GoalItem label="Tuky"      value={macros.fat}           unit="g"    color="#a855f7"    />
          <GoalItem label="Voda"      value={water}                unit="L"    color="#06b6d4"    />
        </div>
      </Card>

      {/* ── Meal distribution ──────────────────────── */}
      <SectionTitle accent={accent}>Doporučené rozložení</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>
          Procento denního kalorického příjmu na každý slot
        </div>
        {MEAL_SLOTS.map(slot => {
          const pct = mealDistrib[slot.id] ?? 0;
          if (pct === 0) return null;
          const kcal = Math.round((pct / 100) * kcalGoal);
          return (
            <div key={slot.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: T.text }}>{slot.icon} {slot.label}</span>
                <span style={{ fontSize: 12, color: T.muted }}>{pct} % · ~{kcal} kcal</span>
              </div>
              <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: accent, borderRadius: 2, transition: 'width 0.4s' }} />
              </div>
            </div>
          );
        })}
      </Card>

      {/* ── Tips ───────────────────────────────────── */}
      <SectionTitle accent={accent}>Tipy pro {primeCfg.label}</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        {primeCfg.tips.map((tip, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10,
            paddingBottom: i < primeCfg.tips.length - 1 ? 10 : 0,
            marginBottom:  i < primeCfg.tips.length - 1 ? 10 : 0,
            borderBottom:  i < primeCfg.tips.length - 1 ? `1px solid ${T.border}` : 'none',
          }}>
            <span style={{ color: accent, fontSize: 16, flexShrink: 0 }}>💡</span>
            <span style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{tip}</span>
          </div>
        ))}
      </Card>

    </div>
  );
}

// ─── Training type card ───────────────────────────────────────
type TConfig = typeof TRAINING_TYPES[number];

function TrainingCard({
  t, selected, hours, intensity, onToggle, onHoursChange, onIntensityChange,
}: {
  t:                  TConfig;
  selected:           Set<TrainingType>;
  hours:              number;
  intensity:          ActivityIntensity;
  onToggle:           (id: TrainingType) => void;
  onHoursChange:      (id: TrainingType, delta: number) => void;
  onIntensityChange:  (id: TrainingType, val: ActivityIntensity) => void;
}) {
  const isActive = selected.has(t.id);
  const isRest   = t.id === 'rest';

  return (
    <button
      onClick={() => onToggle(t.id)}
      style={{
        background:   isActive ? t.color + '18' : T.card,
        border:       `1px solid ${isActive ? t.color : T.border}`,
        borderRadius: 14,
        padding:      '12px 14px',
        cursor:       'pointer',
        textAlign:    'left',
        fontFamily:   'DM Sans, sans-serif',
        boxShadow:    isActive ? `0 0 18px ${t.glow}` : 'none',
        transition:   'all 0.2s',
        width:        '100%',
      }}
    >
      {/* ── Header row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: isActive ? t.color : T.text }}>
              {t.label}
            </span>
            {isActive && (
              <span style={{ fontSize: 10, background: t.color + '22', color: t.color, borderRadius: 10, padding: '1px 8px', fontWeight: 600 }}>
                ✓ Vybráno
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: T.muted }}>{t.desc}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontSize: 11, color: T.muted }}>Sacharidy</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? t.color : T.text }}>
            {t.macros.carbs} g/kg
          </div>
        </div>
      </div>

      {/* ── Expanded section when active ── */}
      {isActive && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.color}33` }}>

          {/* Macros row */}
          <div style={{ display: 'flex', gap: 16, marginBottom: isRest ? 0 : 12 }}>
            <MacroChip color="#f59e0b" label="Sacharidy" value={`${t.macros.carbs} g/kg`} />
            <MacroChip color="#22c55e" label="Bílkoviny" value={`${t.macros.protein} g/kg`} />
            <MacroChip color="#a855f7" label="Tuky"      value={`${t.macros.fat} g/kg`} />
            <MacroChip color="#06b6d4" label="Mikro ×"   value={`${t.microMul}`} />
          </div>

          {/* Hours + Intensity (hidden for rest) */}
          {!isRest && (
            <>
              {/* Hours control */}
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}
                onClick={e => e.stopPropagation()}
              >
                <span style={{ fontSize: 12, color: T.muted }}>⏱ Délka</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={e => { e.stopPropagation(); onHoursChange(t.id, -0.5); }}
                    style={{ width: 26, height: 26, borderRadius: 6, background: T.border, border: 'none', color: T.text, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >−</button>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: t.color, minWidth: 44, textAlign: 'center' }}>
                    {hours.toFixed(1)} h
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); onHoursChange(t.id, 0.5); }}
                    style={{ width: 26, height: 26, borderRadius: 6, background: t.color + '22', border: `1px solid ${t.color}44`, color: t.color, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >+</button>
                </div>
              </div>

              {/* Intensity selector */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={e => e.stopPropagation()}
              >
                <span style={{ fontSize: 12, color: T.muted, flexShrink: 0 }}>⚡ Intenzita</span>
                <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                  {INTENSITIES.map(lv => (
                    <button
                      key={lv.id}
                      onClick={e => { e.stopPropagation(); onIntensityChange(t.id, lv.id); }}
                      style={{
                        flex:         1,
                        padding:      '4px 0',
                        borderRadius: 8,
                        border:       `1px solid ${intensity === lv.id ? lv.color : T.border}`,
                        background:   intensity === lv.id ? lv.color + '22' : T.card,
                        color:        intensity === lv.id ? lv.color : T.muted,
                        fontSize:     11,
                        fontWeight:   intensity === lv.id ? 700 : 400,
                        cursor:       'pointer',
                        transition:   'all 0.15s',
                      }}
                    >
                      {lv.label}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>
                  ×{INTENSITY_MUL[intensity]}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </button>
  );
}

function MacroChip({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: T.muted }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

function GoalItem({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div style={{ flex: '1 0 33%', padding: '8px 0', borderBottom: `1px solid ${T.border}`, textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: T.muted }}>{label}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color }}>
        {value}
        <span style={{ fontSize: 11, color: T.muted, marginLeft: 2 }}>{unit}</span>
      </div>
    </div>
  );
}
