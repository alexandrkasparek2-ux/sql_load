import { useContext, useState, useEffect } from 'react';
import { AppContext }   from '../App';
import { T, Card, SectionTitle, Btn } from '../components/UI';
import {
  TRAINING_TYPES, MEAL_SLOTS, calcCaloriesMulti, calcMacros, calcWater, primaryType,
  type TrainingType,
} from '../constants/training';

// Suggested meal % distributions by training type
const DISTRIBUTIONS: Record<string, Record<string, number>> = {
  // Cycling
  rest:       { snidane: 25, dop_svacina: 10, obed: 30, odp_svacina: 10, vecere: 25 },
  light:      { snidane: 20, dop_svacina: 10, obed: 25, odp_svacina: 10, pred_tren: 10, behem_tren:  5, po_tren: 10, vecere: 10 },
  medium:     { snidane: 20, dop_svacina: 10, obed: 20, odp_svacina: 10, pred_tren: 10, behem_tren: 10, po_tren: 10, vecere: 10 },
  hard:       { snidane: 20, dop_svacina: 10, obed: 15, odp_svacina: 10, pred_tren: 10, behem_tren: 15, po_tren: 10, vecere: 10 },
  race:       { snidane: 20, dop_svacina: 10, obed: 10, odp_svacina:  5, pred_tren: 10, behem_tren: 20, po_tren: 15, vecere: 10 },
  // Other sports
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

// Initialize selectedTypes from saved trainingDay data
function initSelected(trainingType: TrainingType, extraTypes: TrainingType[]): Set<TrainingType> {
  if (extraTypes.length > 0) return new Set(extraTypes);
  return new Set([trainingType]);
}

export default function Plan() {
  const ctx = useContext(AppContext);
  const { accent, trainingDay, upsertTrainingDay, profile } = ctx;

  const savedPrimary = trainingDay?.training_type ?? 'rest';
  const savedExtra   = trainingDay?.extra_types   ?? [];

  const [selected, setSelected] = useState<Set<TrainingType>>(() => initSelected(savedPrimary, savedExtra));
  const [hours,    setHours]    = useState(trainingDay?.ride_hours ?? 0);
  const [saving,   setSaving]   = useState(false);

  // Sync state when trainingDay loads from DB
  useEffect(() => {
    setSelected(initSelected(
      trainingDay?.training_type ?? 'rest',
      trainingDay?.extra_types   ?? [],
    ));
    setHours(trainingDay?.ride_hours ?? 0);
  }, [trainingDay?.training_type, trainingDay?.extra_types, trainingDay?.ride_hours]);

  const toggle = (id: TrainingType) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (id === 'rest') return new Set(['rest']);
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

  const saveSelection = async () => {
    const types = Array.from(selected) as TrainingType[];
    const prime = primaryType(types);
    setSaving(true);
    await upsertTrainingDay({ training_type: prime, extra_types: types, ride_hours: hours });
    setSaving(false);
  };

  const handleHoursSave = async () => {
    const types = Array.from(selected) as TrainingType[];
    const prime = primaryType(types);
    setSaving(true);
    await upsertTrainingDay({ training_type: prime, extra_types: types, ride_hours: hours });
    setSaving(false);
  };

  const selectedTypes   = Array.from(selected) as TrainingType[];
  const prime           = primaryType(selectedTypes);
  const primeCfg        = TRAINING_TYPES.find(t => t.id === prime)!;
  const mealDistribution = DISTRIBUTIONS[prime] ?? {};

  const demoProfile = profile ?? { weight: 70, height: 175, age: 30, gender: 'male' as const };
  const kcalGoal    = calcCaloriesMulti(demoProfile, selectedTypes, hours);
  const macros      = calcMacros(demoProfile, prime);
  const water       = calcWater(demoProfile, hours);

  const cyclingTypes = TRAINING_TYPES.filter(t => t.category === 'cycling');
  const sportTypes   = TRAINING_TYPES.filter(t => t.category === 'sport');

  const hasActive   = !selected.has('rest') || selected.size > 1;
  const multiSelect = selected.size > 1 || (selected.size === 1 && !selected.has('rest'));

  // Determine whether selection has changed from saved state (to show Save button)
  const savedKey   = [savedPrimary, ...savedExtra].sort().join(',');
  const currentKey = selectedTypes.sort().join(',');
  const isDirty    = savedKey !== currentKey;

  return (
    <div style={{ padding: '16px 16px 0' }}>

      {/* ── Multi-select hint ─────────────────────────── */}
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>💡</span>
        Můžeš vybrat více aktivit najednou — kalorie se sečtou
      </div>

      {/* ── Cycling types ────────────────────────────── */}
      <SectionTitle accent={accent}>🚴 Cyklistika</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {cyclingTypes.map(t => (
          <TrainingCard
            key={t.id}
            t={t}
            selected={selected}
            onToggle={toggle}
          />
        ))}
      </div>

      {/* ── Other sports ─────────────────────────────── */}
      <SectionTitle accent={accent}>🏅 Ostatní sporty</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {sportTypes.map(t => (
          <TrainingCard
            key={t.id}
            t={t}
            selected={selected}
            onToggle={toggle}
          />
        ))}
      </div>

      {/* ── Selected summary + Save ───────────────────── */}
      {multiSelect && (
        <Card style={{ marginBottom: 20, background: primeCfg.color + '10', border: `1px solid ${primeCfg.color}40` }}>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>Vybrané aktivity</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: isDirty ? 12 : 0 }}>
            {selectedTypes.map(id => {
              const cfg = TRAINING_TYPES.find(t => t.id === id)!;
              return (
                <span key={id} style={{
                  fontSize: 12, fontWeight: 600,
                  background: cfg.color + '22', color: cfg.color,
                  borderRadius: 10, padding: '3px 10px',
                  border: `1px solid ${cfg.color}44`,
                }}>
                  {cfg.icon} {cfg.label}
                </span>
              );
            })}
          </div>
          {isDirty && (
            <Btn accent={primeCfg.color} size="md" full onClick={saveSelection} disabled={saving}>
              {saving ? 'Ukládám…' : 'Uložit výběr'}
            </Btn>
          )}
        </Card>
      )}

      {/* ── Duration slider (only when something active) ── */}
      {hasActive && (
        <div style={{ marginBottom: 20 }}>
          <SectionTitle accent={accent}>Celková délka aktivity</SectionTitle>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: T.muted }}>
                {selected.size > 1 ? `Celkem (${selected.size} aktivity)` : 'Hodiny aktivity'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setHours(h => Math.max(0, parseFloat((h - 0.5).toFixed(1))))}
                  style={{ width: 28, height: 28, borderRadius: 7, background: T.border, border: 'none', color: T.text, cursor: 'pointer', fontSize: 16 }}
                >−</button>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: accent, minWidth: 52, textAlign: 'center' }}>
                  {hours.toFixed(1)} h
                </span>
                <button
                  onClick={() => setHours(h => Math.min(12, parseFloat((h + 0.5).toFixed(1))))}
                  style={{ width: 28, height: 28, borderRadius: 7, background: accent + '22', border: `1px solid ${accent}44`, color: accent, cursor: 'pointer', fontSize: 16 }}
                >+</button>
              </div>
            </div>
            <input
              type="range"
              min={0} max={12} step={0.5}
              value={hours}
              onChange={e => setHours(Number(e.target.value))}
              style={{ background: `linear-gradient(to right, ${accent} ${(hours / 12) * 100}%, ${T.border} 0%)` }}
            />
            <style>{`input[type=range]::-webkit-slider-thumb { background: ${accent}; } input[type=range]::-moz-range-thumb { background: ${accent}; }`}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted, marginTop: 4 }}>
              <span>0 h</span><span>6 h</span><span>12 h</span>
            </div>
            {selected.size > 1 && (
              <div style={{ marginTop: 8, fontSize: 11, color: T.muted, textAlign: 'center' }}>
                ≈ {(hours / selected.size).toFixed(1)} h / aktivitu
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <Btn accent={accent} size="md" full onClick={handleHoursSave} disabled={saving}>
                {saving ? 'Ukládám…' : 'Uložit délku aktivity'}
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* ── Calculated targets ─────────────────────── */}
      <SectionTitle accent={accent}>Dnešní cíle</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
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
          const pct = mealDistribution[slot.id] ?? 0;
          if (pct === 0) return null;
          const kcal = Math.round((pct / 100) * kcalGoal);
          return (
            <div key={slot.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: T.text }}>
                  {slot.icon} {slot.label}
                </span>
                <span style={{ fontSize: 12, color: T.muted }}>
                  {pct} % · ~{kcal} kcal
                </span>
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
            display:       'flex',
            gap:           10,
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
  t, selected, onToggle,
}: {
  t:        TConfig;
  selected: Set<TrainingType>;
  onToggle: (id: TrainingType) => void;
}) {
  const isActive = selected.has(t.id);
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
      }}
    >
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

      {isActive && (
        <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.color}33` }}>
          <MacroChip color="#f59e0b" label="Sacharidy" value={`${t.macros.carbs} g/kg`} />
          <MacroChip color="#22c55e" label="Bílkoviny" value={`${t.macros.protein} g/kg`} />
          <MacroChip color="#a855f7" label="Tuky"      value={`${t.macros.fat} g/kg`} />
          <MacroChip color="#06b6d4" label="Mikro ×"   value={`${t.microMul}`} />
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
