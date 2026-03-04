import React, { useState, useContext, useMemo } from 'react';
import { AppContext }    from '../App';
import { T, Card, SectionTitle, ProgressBar, Btn } from '../components/UI';
import { FOODS, FOOD_CATEGORIES, type Food } from '../constants/foods';
import { MEAL_SLOTS }    from '../constants/training';
import type { FoodEntry } from '../hooks/useFoodEntries';
import BarcodeScanner    from '../components/BarcodeScanner';

// ─── helpers ────────────────────────────────────────────────
function scaleNutrient(val: number, grams: number) {
  return parseFloat((val * grams / 100).toFixed(2));
}

function buildEntry(
  food: Food, grams: number, userId: string, date: string, mealSlot: string,
): Omit<FoodEntry, 'id'> {
  const f = grams / 100;
  return {
    user_id:   userId,
    date,
    meal_slot: mealSlot,
    food_id:   food.id,
    food_name: food.name,
    grams,
    kcal:    parseFloat((food.kcal    * f).toFixed(1)),
    carbs:   parseFloat((food.carbs   * f).toFixed(1)),
    protein: parseFloat((food.protein * f).toFixed(1)),
    fat:     parseFloat((food.fat     * f).toFixed(1)),
    na:      parseFloat((food.micros.na     * f).toFixed(1)),
    k:       parseFloat((food.micros.k      * f).toFixed(1)),
    mg:      parseFloat((food.micros.mg     * f).toFixed(1)),
    ca:      parseFloat((food.micros.ca     * f).toFixed(1)),
    fe:      parseFloat((food.micros.fe     * f).toFixed(2)),
    vit_c:   parseFloat((food.micros.vit_c  * f).toFixed(1)),
    vit_d:   parseFloat((food.micros.vit_d  * f).toFixed(2)),
    b12:     parseFloat((food.micros.b12    * f).toFixed(2)),
    omega3:  parseFloat((food.micros.omega3 * f).toFixed(1)),
    zn:      parseFloat((food.micros.zn     * f).toFixed(2)),
  };
}

// ─── FoodPicker modal ────────────────────────────────────────
interface FoodPickerProps {
  mealSlot:  string;
  mealLabel: string;
  accent:    string;
  onClose:   () => void;
  onConfirm: (entry: Omit<FoodEntry, 'id'>) => Promise<void>;
  userId:    string;
  date:      string;
}

function FoodPicker({ mealSlot, mealLabel, accent, onClose, onConfirm, userId, date }: FoodPickerProps) {
  const [step,        setStep]        = useState<'browse' | 'portion'>('browse');
  const [selCat,      setSelCat]      = useState('');
  const [search,      setSearch]      = useState('');
  const [food,        setFood]        = useState<Food | null>(null);
  const [grams,       setGrams]       = useState(100);
  const [loading,     setLoading]     = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const filtered = useMemo(() => {
    return FOODS.filter(f => {
      const matchCat    = !selCat  || f.cat === selCat;
      const matchSearch = !search  || f.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selCat, search]);

  const preview = food ? {
    kcal:    scaleNutrient(food.kcal,    grams),
    carbs:   scaleNutrient(food.carbs,   grams),
    protein: scaleNutrient(food.protein, grams),
    fat:     scaleNutrient(food.fat,     grams),
  } : null;

  const handleSelectFood = (f: Food) => {
    setFood(f);
    setGrams(f.per);
    setStep('portion');
  };

  const handleBarcodeResult = (f: Food) => {
    setShowScanner(false);
    handleSelectFood(f);
  };

  const handleConfirm = async () => {
    if (!food) return;
    setLoading(true);
    await onConfirm(buildEntry(food, grams, userId, date, mealSlot));
    setLoading(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 100,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Bottom sheet */}
      <div style={{
        position:      'fixed',
        bottom:        0,
        left:          '50%',
        transform:     'translateX(-50%)',
        width:         '100%',
        maxWidth:      500,
        background:    T.card,
        borderRadius:  '20px 20px 0 0',
        border:        `1px solid ${T.border}`,
        borderBottom:  'none',
        zIndex:        101,
        maxHeight:     '88dvh',
        display:       'flex',
        flexDirection: 'column',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border }} />
        </div>

        {/* Header */}
        <div style={{ padding: '10px 16px 12px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: T.text }}>
                {step === 'browse' ? 'Vybrat potravinu' : food?.name}
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{mealLabel}</div>
            </div>
            <button
              onClick={step === 'portion' ? () => setStep('browse') : onClose}
              style={{ background: 'none', border: 'none', color: T.muted, fontSize: 20, cursor: 'pointer', padding: 4 }}
            >
              {step === 'portion' ? '‹' : '✕'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 24px' }}>

          {step === 'browse' && (
            <>
              {/* Search + barcode scan row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Hledat potravinu…"
                  style={{
                    flex: 1, background: T.bg, border: `1px solid ${T.border}`,
                    borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 14,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => setShowScanner(true)}
                  title="Skenovat čárový kód"
                  style={{
                    flexShrink: 0,
                    background:   accent + '22',
                    border:       `1px solid ${accent}44`,
                    borderRadius: 10,
                    padding:      '10px 14px',
                    color:        accent,
                    fontSize:     18,
                    cursor:       'pointer',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                  }}
                >
                  📷
                </button>
              </div>

              {/* Category pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <button
                  onClick={() => setSelCat('')}
                  style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    background: !selCat ? accent : T.bg,
                    border:     `1px solid ${!selCat ? accent : T.border}`,
                    color:      !selCat ? '#fff' : T.muted,
                    fontFamily: 'DM Sans, sans-serif',
                    transition: 'all 0.15s',
                  }}
                >
                  Vše
                </button>
                {FOOD_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelCat(prev => prev === cat ? '' : cat)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                      background: selCat === cat ? accent : T.bg,
                      border:     `1px solid ${selCat === cat ? accent : T.border}`,
                      color:      selCat === cat ? '#fff' : T.muted,
                      fontFamily: 'DM Sans, sans-serif',
                      transition: 'all 0.15s',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Food list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filtered.length === 0 && (
                  <div style={{ textAlign: 'center', color: T.muted, padding: '30px 0', fontSize: 14 }}>
                    Žádná potravina nenalezena.
                  </div>
                )}
                {filtered.map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleSelectFood(f)}
                    style={{
                      background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
                      padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontFamily: 'DM Sans, sans-serif', transition: 'border-color 0.15s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, color: T.text, fontWeight: 500 }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: T.muted }}>
                        {f.cat} • {f.per} g ref.
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: accent }}>{f.kcal} kcal</div>
                      <div style={{ fontSize: 11, color: T.muted }}>/ 100 g</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'portion' && food && preview && (
            <>
              {/* Food macros reference */}
              <div style={{
                background: T.bg, borderRadius: 10, padding: '10px 12px',
                marginBottom: 16, fontSize: 12, color: T.muted,
                display: 'flex', gap: 12, flexWrap: 'wrap',
              }}>
                <span>Per 100 g:</span>
                <span><b style={{ color: accent }}>{food.kcal}</b> kcal</span>
                <span><b style={{ color: '#f59e0b' }}>{food.carbs}g</b> sacharidy</span>
                <span><b style={{ color: '#22c55e' }}>{food.protein}g</b> bílkoviny</span>
                <span><b style={{ color: '#a855f7' }}>{food.fat}g</b> tuky</span>
              </div>

              {/* Grams slider */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, color: T.muted }}>Množství</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => setGrams(g => Math.max(5, g - 5))}
                      style={{ width: 26, height: 26, borderRadius: 6, background: T.border, border: 'none', color: T.text, cursor: 'pointer', fontSize: 16 }}
                    >−</button>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: T.text, minWidth: 52, textAlign: 'center' }}>
                      {grams} g
                    </span>
                    <button
                      onClick={() => setGrams(g => Math.min(600, g + 5))}
                      style={{ width: 26, height: 26, borderRadius: 6, background: accent + '22', border: `1px solid ${accent}44`, color: accent, cursor: 'pointer', fontSize: 16 }}
                    >+</button>
                  </div>
                </div>
                <input
                  type="range"
                  min={5} max={600} step={5}
                  value={grams}
                  onChange={e => setGrams(Number(e.target.value))}
                  style={{ background: `linear-gradient(to right, ${accent} ${((grams - 5) / 595) * 100}%, ${T.border} 0%)`, borderRadius: 3 }}
                />
                <style>{`input[type=range]::-webkit-slider-thumb { background: ${accent}; } input[type=range]::-moz-range-thumb { background: ${accent}; }`}</style>
              </div>

              {/* Live preview */}
              <div style={{
                background: accent + '12', border: `1px solid ${accent}33`,
                borderRadius: 12, padding: 14, marginBottom: 20,
              }}>
                <div style={{ fontSize: 12, color: accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Nutriční hodnoty pro {grams} g
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: T.text }}>
                    {preview.kcal.toFixed(0)}
                  </span>
                  <span style={{ fontSize: 12, color: T.muted, alignSelf: 'flex-end', marginBottom: 4 }}>kcal</span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <MacroLine label="Sacharidy" value={preview.carbs}   color="#f59e0b" unit="g" />
                  <MacroLine label="Bílkoviny" value={preview.protein} color="#22c55e" unit="g" />
                  <MacroLine label="Tuky"      value={preview.fat}     color="#a855f7" unit="g" />
                </div>
              </div>

              <Btn accent={accent} size="lg" full onClick={handleConfirm} disabled={loading}>
                {loading ? 'Přidávám…' : `+ Přidat do ${mealLabel}`}
              </Btn>
            </>
          )}
        </div>
      </div>

      {/* Barcode scanner overlay */}
      {showScanner && (
        <BarcodeScanner
          accent={accent}
          onResult={handleBarcodeResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}

function MacroLine({ label, value, color, unit }: { label: string; value: number; color: string; unit: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: T.muted }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color }}>{value.toFixed(1)}{unit}</div>
    </div>
  );
}

// ─── Main Foods page ─────────────────────────────────────────
export default function Foods() {
  const ctx = useContext(AppContext);
  const { accent, entries, addEntry, removeEntry, userId, today, goals } = ctx;

  const [activePicker, setActivePicker] = useState<string | null>(null);
  const [confirmDel,   setConfirmDel]   = useState<string | null>(null);

  const slotLabel = MEAL_SLOTS.find(s => s.id === activePicker)?.label ?? '';

  const entriesForSlot = (slotId: string) =>
    entries.filter(e => e.meal_slot === slotId);

  const slotKcal = (slotId: string) =>
    entriesForSlot(slotId).reduce((s, e) => s + e.kcal, 0);

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <SectionTitle
        accent={accent}
        right={
          <div style={{ fontSize: 12, color: T.muted }}>
            {Math.round(ctx.totals.kcal)} / {Math.round(goals.kcal)} kcal
          </div>
        }
      >
        Jídelní deník
      </SectionTitle>

      {/* Overall progress bar */}
      <div style={{ marginBottom: 16 }}>
        <ProgressBar value={ctx.totals.kcal} max={goals.kcal} color={accent} height={6} showLabel />
      </div>

      {/* Meal slots */}
      {MEAL_SLOTS.map(slot => {
        const slotEntries = entriesForSlot(slot.id);
        const kcal        = slotKcal(slot.id);

        return (
          <div key={slot.id} style={{ marginBottom: 12 }}>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {/* Slot header */}
              <div style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'center',
                padding:        '10px 14px',
                borderBottom:   slotEntries.length > 0 ? `1px solid ${T.border}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{slot.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{slot.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {kcal > 0 && (
                    <span style={{ fontSize: 12, color: accent, fontWeight: 600 }}>
                      {Math.round(kcal)} kcal
                    </span>
                  )}
                  <button
                    onClick={() => setActivePicker(slot.id)}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: accent + '22', border: `1px solid ${accent}44`,
                      color: accent, fontSize: 18, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >+</button>
                </div>
              </div>

              {/* Food entries */}
              {slotEntries.map(entry => (
                <div
                  key={entry.id}
                  style={{
                    display:        'flex',
                    justifyContent: 'space-between',
                    alignItems:     'center',
                    padding:        '8px 14px',
                    borderBottom:   `1px solid ${T.border}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.food_name}
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                      {entry.grams} g
                      &nbsp;·&nbsp;<span style={{ color: '#f59e0b' }}>{entry.carbs.toFixed(0)}g S</span>
                      &nbsp;·&nbsp;<span style={{ color: '#22c55e' }}>{entry.protein.toFixed(0)}g B</span>
                      &nbsp;·&nbsp;<span style={{ color: '#a855f7' }}>{entry.fat.toFixed(0)}g T</span>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: accent }}>
                      {Math.round(entry.kcal)} kcal
                    </span>
                    {confirmDel === entry.id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => { removeEntry(entry.id!); setConfirmDel(null); }}
                          style={{ background: '#ef444422', border: '1px solid #ef444444', borderRadius: 6, color: '#ef4444', fontSize: 11, padding: '3px 8px', cursor: 'pointer' }}
                        >
                          Smazat
                        </button>
                        <button
                          onClick={() => setConfirmDel(null)}
                          style={{ background: T.border, border: 'none', borderRadius: 6, color: T.muted, fontSize: 11, padding: '3px 8px', cursor: 'pointer' }}
                        >
                          Zrušit
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDel(entry.id!)}
                        style={{ background: 'none', border: 'none', color: T.muted, fontSize: 16, cursor: 'pointer', padding: 2, opacity: 0.6 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        );
      })}

      {/* Totals bar */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <TotalItem label="Celkem"    value={`${Math.round(ctx.totals.kcal)} kcal`}    color={accent}    />
          <TotalItem label="Sacharidy" value={`${ctx.totals.carbs.toFixed(0)} g`}        color="#f59e0b"  />
          <TotalItem label="Bílkoviny" value={`${ctx.totals.protein.toFixed(0)} g`}      color="#22c55e"  />
          <TotalItem label="Tuky"      value={`${ctx.totals.fat.toFixed(0)} g`}          color="#a855f7"  />
        </div>
      </Card>

      {/* Food picker modal */}
      {activePicker && (
        <FoodPicker
          mealSlot={activePicker}
          mealLabel={slotLabel}
          accent={accent}
          userId={userId}
          date={today}
          onClose={() => setActivePicker(null)}
          onConfirm={addEntry}
        />
      )}
    </div>
  );
}

function TotalItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: T.muted }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
