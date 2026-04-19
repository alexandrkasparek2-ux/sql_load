import { useState, useContext, useMemo } from 'react';
import { AppContext }    from '../App';
import { T, BRAND, Card, SectionTitle, ProgressBar, Btn } from '../components/UI';
import { FOODS, FOOD_CATEGORIES, type Food } from '../constants/foods';
import { MEAL_SLOTS }    from '../constants/training';
import type { FoodEntry } from '../hooks/useFoodEntries';
import { useSavedMeals, type SavedMeal } from '../hooks/useSavedMeals';
import BarcodeScanner    from '../components/BarcodeScanner';
import FoodScanner      from '../components/FoodScanner';

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
    fiber:   parseFloat(((food.fiber ?? 0) * f).toFixed(1)),
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
  mealSlot:            string;
  mealLabel:           string;
  accent:              string;
  onClose:             () => void;
  onConfirm:           (entry: Omit<FoodEntry, 'id'>) => Promise<FoodEntry | null>;
  onSaveCustomFood:    (food: Food) => void;
  onSaveMeal:          (meal: Omit<SavedMeal, 'id' | 'createdAt'>) => void;
  onUpdateSavedMeal:   (id: string, meal: Omit<SavedMeal, 'id' | 'createdAt'>) => void;
  onDeleteSavedMeal:   (id: string) => void;
  savedMeals:          SavedMeal[];
  userId:              string;
  date:                string;
  allFoods:            Food[];
}

function FoodPicker({ mealSlot, mealLabel, accent, onClose, onConfirm, onSaveCustomFood, onSaveMeal, onUpdateSavedMeal, onDeleteSavedMeal, savedMeals, userId, date, allFoods }: FoodPickerProps) {
  type Step = 'browse' | 'portion' | 'custom' | 'recipe' | 'saved_portion';
  const [step,        setStep]        = useState<Step>('browse');
  // browse / portion
  const [selCat,      setSelCat]      = useState('');
  const [search,      setSearch]      = useState('');
  const [food,        setFood]        = useState<Food | null>(null);
  const [grams,       setGrams]       = useState(100);
  const [loading,     setLoading]     = useState(false);
  const [showScanner,     setShowScanner]     = useState(false);
  const [showFoodScanner, setShowFoodScanner] = useState(false);
  // custom step
  const [cName,    setCName]    = useState('');
  const [cKcal,    setCKcal]    = useState('');
  const [cCarbs,   setCCarbs]   = useState('');
  const [cProtein, setCProtein] = useState('');
  const [cFat,     setCFat]     = useState('');
  const [cGrams,   setCGrams]   = useState(100);
  const [cSave,    setCSave]    = useState(false);
  // recipe step
  const [rName,   setRName]   = useState('');
  const [rIngs,   setRIngs]   = useState<{food: Food; grams: number}[]>([]);
  const [rSearch, setRSearch] = useState('');
  const [rShow,   setRShow]   = useState(false);
  const [rSave,   setRSave]   = useState(false);
  const [rEditId, setREditId] = useState<string | null>(null);
  // saved meal portion step
  const [savedMealSel,   setSavedMealSel]   = useState<SavedMeal | null>(null);
  const [savedMealGrams, setSavedMealGrams] = useState(100);

  const categories = useMemo(() => {
    const used = new Set(allFoods.map(f => f.cat));
    return FOOD_CATEGORIES.filter(c => used.has(c));
  }, [allFoods]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Require either a search query or a selected category — never dump all 400+ foods
    if (!q && !selCat) return [];
    return allFoods.filter(f => {
      const n = f.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return (!selCat || f.cat === selCat) && (!q || n.includes(q));
    }).slice(0, 60);
  }, [allFoods, selCat, search]);

  const rFiltered = useMemo(() => {
    if (!rSearch) return [];
    const q = rSearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return allFoods.filter(f => {
      const n = f.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return n.includes(q);
    }).slice(0, 12);
  }, [allFoods, rSearch]);

  const preview = food ? {
    kcal:    scaleNutrient(food.kcal,    grams),
    carbs:   scaleNutrient(food.carbs,   grams),
    protein: scaleNutrient(food.protein, grams),
    fat:     scaleNutrient(food.fat,     grams),
  } : null;

  const rTotals = rIngs.reduce(
    (acc, ing) => ({
      grams:   acc.grams   + ing.grams,
      kcal:    acc.kcal    + scaleNutrient(ing.food.kcal,    ing.grams),
      carbs:   acc.carbs   + scaleNutrient(ing.food.carbs,   ing.grams),
      protein: acc.protein + scaleNutrient(ing.food.protein, ing.grams),
      fat:     acc.fat     + scaleNutrient(ing.food.fat,     ing.grams),
    }),
    { grams: 0, kcal: 0, carbs: 0, protein: 0, fat: 0 }
  );

  const handleSelectFood = (f: Food) => { setFood(f); setGrams(f.per); setStep('portion'); };
  const handleBarcodeResult = (f: Food) => { setShowScanner(false); handleSelectFood(f); };
  const handleFoodScanResult = async (entry: Omit<FoodEntry, 'id'>): Promise<FoodEntry | null> => {
    setShowFoodScanner(false);
    const saved = await onConfirm(entry);
    onClose();
    return saved;
  };

  const handleConfirm = async () => {
    if (!food) return;
    setLoading(true);
    await onConfirm(buildEntry(food, grams, userId, date, mealSlot));
    setLoading(false);
    onClose();
  };

  const handleCustomConfirm = async () => {
    if (!cName.trim()) return;
    const kc = parseFloat(cKcal)    || 0;
    const cb = parseFloat(cCarbs)   || 0;
    const pr = parseFloat(cProtein) || 0;
    const ft = parseFloat(cFat)     || 0;
    const f  = cGrams / 100;
    if (cSave) {
      onSaveCustomFood({
        id: `custom_${Date.now()}`, cat: '⭐ Vlastní', name: cName.trim(),
        kcal: kc, carbs: cb, protein: pr, fat: ft, per: cGrams,
        micros: { na: 0, k: 0, mg: 0, ca: 0, fe: 0, vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0 },
      });
    }
    setLoading(true);
    await onConfirm({
      user_id: userId, date, meal_slot: mealSlot,
      food_id: `custom_${Date.now()}`, food_name: cName.trim(),
      grams: cGrams,
      kcal:    parseFloat((kc * f).toFixed(1)),
      carbs:   parseFloat((cb * f).toFixed(1)),
      protein: parseFloat((pr * f).toFixed(1)),
      fat:     parseFloat((ft * f).toFixed(1)),
      fiber:   0,
      na: 0, k: 0, mg: 0, ca: 0, fe: 0, vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0,
    });
    setLoading(false);
    onClose();
  };

  const handleRecipeConfirm = async (addToSlot: boolean) => {
    if (!rName.trim()) return;

    // Edit mode with no ingredients = rename only (keep existing nutritional values)
    if (rEditId && rIngs.length === 0) {
      const existing = savedMeals.find(m => m.id === rEditId);
      if (existing) onUpdateSavedMeal(rEditId, { ...existing, name: rName.trim() });
      onClose();
      return;
    }

    if (rIngs.length === 0) return;

    const sumM = (key: keyof Food['micros']) =>
      parseFloat(rIngs.reduce((s, ing) => s + scaleNutrient(ing.food.micros[key] as number, ing.grams), 0).toFixed(2));
    const totalGrams = Math.round(rTotals.grams);
    const fiberTotal = parseFloat(rIngs.reduce((s, ing) => s + scaleNutrient(ing.food.fiber ?? 0, ing.grams), 0).toFixed(1));

    const mealData = {
      name:        rName.trim(),
      totalGrams,
      kcal:        parseFloat(rTotals.kcal.toFixed(1)),
      carbs:       parseFloat(rTotals.carbs.toFixed(1)),
      protein:     parseFloat(rTotals.protein.toFixed(1)),
      fat:         parseFloat(rTotals.fat.toFixed(1)),
      fiber:       fiberTotal,
      na: sumM('na'), k: sumM('k'), mg: sumM('mg'), ca: sumM('ca'), fe: sumM('fe'),
      vit_c: sumM('vit_c'), vit_d: sumM('vit_d'), b12: sumM('b12'), omega3: sumM('omega3'), zn: sumM('zn'),
      ingredients: rIngs.map(ing => ({ id: ing.food.id, name: ing.food.name, grams: ing.grams })),
    };

    if (rEditId) {
      onUpdateSavedMeal(rEditId, mealData);
    } else if (rSave) {
      onSaveMeal(mealData);
    }

    if (!addToSlot) { onClose(); return; }

    setLoading(true);
    await onConfirm({
      user_id: userId, date, meal_slot: mealSlot,
      food_id: `recipe_${Date.now()}`, food_name: rName.trim(),
      grams:   totalGrams,
      kcal:    parseFloat(rTotals.kcal.toFixed(1)),
      carbs:   parseFloat(rTotals.carbs.toFixed(1)),
      protein: parseFloat(rTotals.protein.toFixed(1)),
      fat:     parseFloat(rTotals.fat.toFixed(1)),
      fiber:   fiberTotal,
      na: sumM('na'), k: sumM('k'), mg: sumM('mg'), ca: sumM('ca'), fe: sumM('fe'),
      vit_c: sumM('vit_c'), vit_d: sumM('vit_d'), b12: sumM('b12'), omega3: sumM('omega3'), zn: sumM('zn'),
    });
    setLoading(false);
    onClose();
  };

  const handleEditSavedMeal = (meal: SavedMeal) => {
    setRName(meal.name);
    setRSave(true);
    setREditId(meal.id);
    if (meal.ingredients) {
      setRIngs(meal.ingredients.map(ing => {
        const f = allFoods.find(x => x.id === ing.id) ?? {
          id: ing.id, cat: '⭐ Vlastní', name: ing.name,
          kcal: 0, carbs: 0, protein: 0, fat: 0, per: ing.grams,
          micros: { na: 0, k: 0, mg: 0, ca: 0, fe: 0, vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0 },
        };
        return { food: f, grams: ing.grams };
      }));
    } else {
      setRIngs([]);
    }
    setStep('recipe');
  };

  const handleSavedMealConfirm = async () => {
    if (!savedMealSel) return;
    const ratio = savedMealGrams / savedMealSel.totalGrams;
    const scale = (v: number, dec = 2) => parseFloat((v * ratio).toFixed(dec));
    setLoading(true);
    await onConfirm({
      user_id:   userId,
      date,
      meal_slot: mealSlot,
      food_id:   savedMealSel.id,
      food_name: savedMealSel.name,
      grams:     savedMealGrams,
      kcal:      scale(savedMealSel.kcal, 1),
      carbs:     scale(savedMealSel.carbs, 1),
      protein:   scale(savedMealSel.protein, 1),
      fat:       scale(savedMealSel.fat, 1),
      fiber:     scale(savedMealSel.fiber, 1),
      na:        scale(savedMealSel.na),
      k:         scale(savedMealSel.k),
      mg:        scale(savedMealSel.mg),
      ca:        scale(savedMealSel.ca),
      fe:        scale(savedMealSel.fe),
      vit_c:     scale(savedMealSel.vit_c),
      vit_d:     scale(savedMealSel.vit_d),
      b12:       scale(savedMealSel.b12),
      omega3:    scale(savedMealSel.omega3),
      zn:        scale(savedMealSel.zn),
    });
    setLoading(false);
    onClose();
  };

  const stepTitle: Record<Step, string> = {
    browse:        'Vybrat potravinu',
    portion:       food?.name ?? '',
    custom:        'Vlastní jídlo',
    recipe:        rEditId ? 'Upravit recept' : 'Sestavit recept',
    saved_portion: savedMealSel?.name ?? 'Uložené jídlo',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: T.bg, border: `1px solid ${T.border}`,
    borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  };

  const footer = step === 'portion' ? (
    <div style={{
      flexShrink: 0,
      padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
      borderTop: `1px solid ${T.border}`,
      background: T.card,
      boxShadow: '0 -10px 24px rgba(0,0,0,0.28)',
    }}>
      <Btn accent={accent} size="lg" full onClick={handleConfirm} disabled={loading}>
        {loading ? 'Přidávám…' : `+ Přidat do ${mealLabel}`}
      </Btn>
    </div>
  ) : step === 'custom' ? (
    <div style={{
      flexShrink: 0,
      padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
      borderTop: `1px solid ${T.border}`,
      background: T.card,
      boxShadow: '0 -10px 24px rgba(0,0,0,0.28)',
    }}>
      <Btn accent={accent} size="lg" full onClick={handleCustomConfirm} disabled={!cName.trim() || loading}>
        {loading ? 'Přidávám…' : `+ Přidat do ${mealLabel}`}
      </Btn>
    </div>
  ) : step === 'recipe' ? (
    <div style={{
      flexShrink: 0,
      padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
      borderTop: `1px solid ${T.border}`,
      background: T.card,
      boxShadow: '0 -10px 24px rgba(0,0,0,0.28)',
    }}>
      {rEditId ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn accent={accent} size="lg" full onClick={() => handleRecipeConfirm(true)} disabled={!rName.trim() || rIngs.length === 0 || loading}>
            {loading ? 'Ukládám…' : `Uložit a přidat do ${mealLabel}`}
          </Btn>
          <button
            onClick={() => handleRecipeConfirm(false)}
            disabled={!rName.trim() || loading}
            style={{ width: '100%', padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: !rName.trim() || loading ? 'default' : 'pointer', background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, opacity: !rName.trim() || loading ? 0.5 : 1 }}
          >
            Jen uložit změny
          </button>
          {rIngs.length === 0 && (
            <div style={{ fontSize: 12, color: T.muted, textAlign: 'center' }}>
              Přidejte ingredience výše pro aktualizaci výpočtů
            </div>
          )}
        </div>
      ) : (
        <Btn accent={accent} size="lg" full onClick={() => handleRecipeConfirm(true)} disabled={!rName.trim() || rIngs.length === 0 || loading}>
          {loading ? 'Přidávám…' : `+ Přidat do ${mealLabel}`}
        </Btn>
      )}
    </div>
  ) : step === 'saved_portion' ? (
    <div style={{
      flexShrink: 0,
      padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
      borderTop: `1px solid ${T.border}`,
      background: T.card,
      boxShadow: '0 -10px 24px rgba(0,0,0,0.28)',
    }}>
      <Btn accent={accent} size="lg" full onClick={handleSavedMealConfirm} disabled={loading}>
        {loading ? 'Přidávám…' : `+ Přidat do ${mealLabel}`}
      </Btn>
    </div>
  ) : null;

  const inlineActionWrap: React.CSSProperties = {
    position: 'sticky',
    bottom: 0,
    marginTop: 8,
    marginBottom: 8,
    paddingTop: 10,
    background: `linear-gradient(180deg, rgba(13,13,13,0) 0%, ${T.card} 28%)`,
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, backdropFilter: 'blur(4px)' }} />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 500, background: T.card,
        borderRadius: '20px 20px 0 0', border: `1px solid ${T.border}`, borderBottom: 'none',
        zIndex: 101,
        height: 'min(88dvh, calc(100dvh - 12px))',
        display: 'flex',
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
                {stepTitle[step]}
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{mealLabel}</div>
            </div>
            <button
              onClick={() => {
                if (step === 'browse') { onClose(); return; }
                if (step === 'saved_portion') { setSavedMealSel(null); setStep('browse'); return; }
                if (step === 'recipe') { setREditId(null); }
                setStep('browse');
              }}
              style={{ background: 'none', border: 'none', color: T.muted, fontSize: 20, cursor: 'pointer', padding: 4 }}
            >{step === 'browse' ? '✕' : '‹'}</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '12px 16px 16px' }}>

          {/* ── BROWSE ── */}
          {step === 'browse' && (
            <>
              {/* Saved meals section */}
              {savedMeals.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                    💾 Uložená jídla
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {savedMeals.map(meal => (
                      <div
                        key={meal.id}
                        style={{
                          background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
                          padding: '10px 12px', display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', gap: 8,
                        }}
                      >
                        <button
                          onClick={() => { setSavedMealSel(meal); setSavedMealGrams(meal.totalGrams); setStep('saved_portion'); }}
                          style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, minWidth: 0 }}
                        >
                          <div style={{ fontSize: 14, color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {meal.name}
                          </div>
                          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                            {meal.totalGrams} g
                            &nbsp;·&nbsp;<span style={{ color: accent }}>{meal.kcal.toFixed(0)} kcal</span>
                            &nbsp;·&nbsp;<span style={{ color: '#f59e0b' }}>{meal.carbs.toFixed(0)}g S</span>
                            &nbsp;·&nbsp;<span style={{ color: '#22c55e' }}>{meal.protein.toFixed(0)}g B</span>
                            &nbsp;·&nbsp;<span style={{ color: '#a855f7' }}>{meal.fat.toFixed(0)}g T</span>
                          </div>
                        </button>
                        <button
                          onClick={() => handleEditSavedMeal(meal)}
                          title="Upravit recept"
                          style={{ background: 'none', border: 'none', color: T.muted, fontSize: 15, cursor: 'pointer', padding: 4, flexShrink: 0, opacity: 0.7 }}
                        >✏️</button>
                        <button
                          onClick={() => onDeleteSavedMeal(meal.id)}
                          title="Odstranit uložené jídlo"
                          style={{ background: 'none', border: 'none', color: T.muted, fontSize: 16, cursor: 'pointer', padding: 4, flexShrink: 0, opacity: 0.6 }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  onClick={() => setStep('custom')}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, cursor: 'pointer', background: accent + '18', border: `1px solid ${accent}33`, color: accent, fontWeight: 600 }}
                >✏️ Vlastní jídlo</button>
                <button
                  onClick={() => setStep('recipe')}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, cursor: 'pointer', background: T.bg, border: `1px solid ${T.border}`, color: T.text }}
                >🍳 Z receptu</button>
              </div>

              {/* Search + barcode + AI scan */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Hledat potravinu…" style={inputStyle} />
                <button onClick={() => setShowScanner(true)} title="Skenovat čárový kód"
                  style={{ flexShrink: 0, background: accent + '22', border: `1px solid ${accent}44`, borderRadius: 10, padding: '10px 14px', color: accent, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📷</button>
                <button onClick={() => setShowFoodScanner(true)} title="Scan jídla pomocí AI"
                  style={{ flexShrink: 0, background: '#00e676' + '22', border: '1px solid #00e67644', borderRadius: 10, padding: '10px 14px', color: '#00e676', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</button>
              </div>

              {/* Category pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <button onClick={() => setSelCat('')}
                  style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: !selCat ? accent : T.bg, border: `1px solid ${!selCat ? accent : T.border}`, color: !selCat ? '#fff' : T.muted, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>Vše</button>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setSelCat(prev => prev === cat ? '' : cat)}
                    style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: selCat === cat ? accent : T.bg, border: `1px solid ${selCat === cat ? accent : T.border}`, color: selCat === cat ? '#fff' : T.muted, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}
                  >{cat}</button>
                ))}
              </div>

              {/* Food list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {!search && !selCat && (
                  <div style={{ textAlign: 'center', color: T.muted, padding: '30px 0', fontSize: 14 }}>
                    🔍 Vyhledej potravinu nebo vyber kategorii
                  </div>
                )}
                {(search || selCat) && filtered.length === 0 && (
                  <div style={{ textAlign: 'center', color: T.muted, padding: '30px 0', fontSize: 14 }}>Žádná potravina nenalezena.</div>
                )}
                {filtered.map(f => (
                  <button key={f.id} onClick={() => handleSelectFood(f)}
                    style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'DM Sans, sans-serif', transition: 'border-color 0.15s' }}>
                    <div>
                      <div style={{ fontSize: 14, color: T.text, fontWeight: 500 }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: T.muted }}>{f.cat} • {f.per} g ref.</div>
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

          {/* ── PORTION ── */}
          {step === 'portion' && food && preview && (
            <>
              <div style={{ background: T.bg, borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: T.muted, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>Per 100 g:</span>
                <span><b style={{ color: accent }}>{food.kcal}</b> kcal</span>
                <span><b style={{ color: '#f59e0b' }}>{food.carbs}g</b> sacharidy</span>
                <span><b style={{ color: '#22c55e' }}>{food.protein}g</b> bílkoviny</span>
                <span><b style={{ color: '#a855f7' }}>{food.fat}g</b> tuky</span>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, color: T.muted }}>Množství</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => setGrams(g => Math.max(5, g - 5))} style={{ width: 26, height: 26, borderRadius: 6, background: T.border, border: 'none', color: T.text, cursor: 'pointer', fontSize: 16 }}>−</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <input
                        type="number" inputMode="numeric" value={grams} min={5} max={600}
                        onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) setGrams(Math.min(600, Math.max(5, v))); }}
                        style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: T.text, width: 52, textAlign: 'center', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none', padding: '2px 4px' }}
                      />
                      <span style={{ fontSize: 13, color: T.muted }}>g</span>
                    </div>
                    <button onClick={() => setGrams(g => Math.min(600, g + 5))} style={{ width: 26, height: 26, borderRadius: 6, background: accent + '22', border: `1px solid ${accent}44`, color: accent, cursor: 'pointer', fontSize: 16 }}>+</button>
                  </div>
                </div>
                <input type="range" min={5} max={600} step={5} value={grams} onChange={e => setGrams(Number(e.target.value))}
                  style={{ background: `linear-gradient(to right, ${accent} ${((grams - 5) / 595) * 100}%, ${T.border} 0%)`, borderRadius: 3 }} />
                <style>{`input[type=range]::-webkit-slider-thumb { background: ${accent}; } input[type=range]::-moz-range-thumb { background: ${accent}; }`}</style>
              </div>
              <div style={{ background: accent + '12', border: `1px solid ${accent}33`, borderRadius: 12, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Nutriční hodnoty pro {grams} g</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: T.text }}>{preview.kcal.toFixed(0)}</span>
                  <span style={{ fontSize: 12, color: T.muted, alignSelf: 'flex-end', marginBottom: 4 }}>kcal</span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <MacroLine label="Sacharidy" value={preview.carbs}   color="#f59e0b" unit="g" />
                  <MacroLine label="Bílkoviny" value={preview.protein} color="#22c55e" unit="g" />
                  <MacroLine label="Tuky"      value={preview.fat}     color="#a855f7" unit="g" />
                </div>
              </div>
              <div style={inlineActionWrap}>
                <Btn accent={accent} size="lg" full onClick={handleConfirm} disabled={loading}>
                  {loading ? 'Přidávám…' : `+ Přidat do ${mealLabel}`}
                </Btn>
              </div>
            </>
          )}

          {/* ── CUSTOM ── */}
          {step === 'custom' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: T.muted, display: 'block', marginBottom: 6 }}>Název jídla</label>
                <input type="text" value={cName} onChange={e => setCName(e.target.value)} placeholder="Název vlastní potraviny…" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                {([
                  { label: 'Kalorie / 100 g',   value: cKcal,    set: setCKcal,    unit: 'kcal', color: accent },
                  { label: 'Sacharidy / 100 g',  value: cCarbs,   set: setCCarbs,   unit: 'g',    color: '#f59e0b' },
                  { label: 'Bílkoviny / 100 g',  value: cProtein, set: setCProtein, unit: 'g',    color: '#22c55e' },
                  { label: 'Tuky / 100 g',       value: cFat,     set: setCFat,     unit: 'g',    color: '#a855f7' },
                ] as const).map(({ label, value, set, unit, color }) => (
                  <div key={label}>
                    <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 4 }}>{label}</label>
                    <div style={{ position: 'relative' }}>
                      <input type="number" inputMode="decimal" value={value} onChange={e => (set as (v: string) => void)(e.target.value)}
                        placeholder="0"
                        style={{ width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 30px 9px 12px', color, fontSize: 14, outline: 'none', fontWeight: 600, boxSizing: 'border-box' }} />
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: T.muted }}>{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, color: T.muted }}>Množství</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => setCGrams(g => Math.max(5, g - 5))} style={{ width: 26, height: 26, borderRadius: 6, background: T.border, border: 'none', color: T.text, cursor: 'pointer', fontSize: 16 }}>−</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <input
                        type="number" inputMode="numeric" value={cGrams} min={5} max={1000}
                        onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) setCGrams(Math.min(1000, Math.max(5, v))); }}
                        style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: T.text, width: 52, textAlign: 'center', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none', padding: '2px 4px' }}
                      />
                      <span style={{ fontSize: 13, color: T.muted }}>g</span>
                    </div>
                    <button onClick={() => setCGrams(g => Math.min(1000, g + 5))} style={{ width: 26, height: 26, borderRadius: 6, background: accent + '22', border: `1px solid ${accent}44`, color: accent, cursor: 'pointer', fontSize: 16 }}>+</button>
                  </div>
                </div>
                <input type="range" min={5} max={1000} step={5} value={cGrams} onChange={e => setCGrams(Number(e.target.value))}
                  style={{ background: `linear-gradient(to right, ${accent} ${((cGrams - 5) / 995) * 100}%, ${T.border} 0%)`, borderRadius: 3 }} />
              </div>
              {cKcal && (
                <div style={{ background: accent + '12', border: `1px solid ${accent}33`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: accent, marginBottom: 6 }}>Pro {cGrams} g:</div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <MacroLine label="Kalorie"   value={(parseFloat(cKcal)    || 0) * cGrams / 100} color={accent}    unit=" kcal" />
                    {cCarbs   && <MacroLine label="Sacharidy" value={(parseFloat(cCarbs)   || 0) * cGrams / 100} color="#f59e0b" unit="g" />}
                    {cProtein && <MacroLine label="Bílkoviny" value={(parseFloat(cProtein) || 0) * cGrams / 100} color="#22c55e" unit="g" />}
                    {cFat     && <MacroLine label="Tuky"      value={(parseFloat(cFat)     || 0) * cGrams / 100} color="#a855f7" unit="g" />}
                  </div>
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
                <input type="checkbox" checked={cSave} onChange={e => setCSave(e.target.checked)} style={{ width: 16, height: 16, accentColor: accent }} />
                <span style={{ fontSize: 13, color: T.muted }}>Uložit do vlastních potravin</span>
              </label>
              <div style={inlineActionWrap}>
                <Btn accent={accent} size="lg" full onClick={handleCustomConfirm} disabled={!cName.trim() || loading}>
                  {loading ? 'Přidávám…' : `+ Přidat do ${mealLabel}`}
                </Btn>
              </div>
            </>
          )}

          {/* ── RECIPE ── */}
          {step === 'recipe' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: T.muted, display: 'block', marginBottom: 6 }}>Název jídla / receptu</label>
                <input type="text" value={rName} onChange={e => setRName(e.target.value)} placeholder="Např. Ovesná kaše s banánem…" style={inputStyle} />
              </div>

              {/* Ingredient search */}
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input type="text" value={rSearch}
                  onChange={e => { setRSearch(e.target.value); setRShow(true); }}
                  onFocus={() => setRShow(true)}
                  placeholder="➕ Hledat a přidat ingredienci…"
                  style={inputStyle} />
                {rShow && rFiltered.length > 0 && (
                  <div style={{ position: 'absolute', zIndex: 10, width: '100%', maxHeight: 180, overflowY: 'auto', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, marginTop: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}>
                    {rFiltered.map(f => (
                      <button key={f.id}
                        onClick={() => { setRIngs(prev => [...prev, { food: f, grams: f.per }]); setRSearch(''); setRShow(false); }}
                        style={{ width: '100%', padding: '9px 12px', background: 'none', border: 'none', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: T.text }}>{f.name}</span>
                        <span style={{ fontSize: 12, color: accent }}>{f.kcal} kcal/100g</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ingredient list */}
              {rIngs.length === 0 ? (
                <div style={{ textAlign: 'center', color: T.muted, padding: '20px 0', fontSize: 13 }}>
                  Přidejte ingredience pomocí vyhledávání výše.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {rIngs.map((ing, i) => (
                    <div key={i} style={{ background: T.bg, borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ing.food.name}</div>
                        <div style={{ fontSize: 11, color: accent }}>{scaleNutrient(ing.food.kcal, ing.grams).toFixed(0)} kcal</div>
                      </div>
                      <button onClick={() => setRIngs(prev => prev.map((x, j) => j === i ? { ...x, grams: Math.max(5, x.grams - 5) } : x))}
                        style={{ width: 24, height: 24, borderRadius: 5, background: T.border, border: 'none', color: T.text, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>−</button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input
                          type="number" inputMode="numeric" value={ing.grams} min={1} max={2000}
                          onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) setRIngs(prev => prev.map((x, j) => j === i ? { ...x, grams: Math.min(2000, v) } : x)); }}
                          style={{ fontSize: 13, fontWeight: 600, color: T.text, width: 46, textAlign: 'center', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, outline: 'none', padding: '2px 3px' }}
                        />
                        <span style={{ fontSize: 11, color: T.muted }}>g</span>
                      </div>
                      <button onClick={() => setRIngs(prev => prev.map((x, j) => j === i ? { ...x, grams: Math.min(1000, x.grams + 5) } : x))}
                        style={{ width: 24, height: 24, borderRadius: 5, background: accent + '22', border: `1px solid ${accent}44`, color: accent, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>+</button>
                      <button onClick={() => setRIngs(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', color: T.muted, fontSize: 14, cursor: 'pointer', padding: 2, flexShrink: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {rIngs.length > 0 && (
                <div style={{ background: accent + '12', border: `1px solid ${accent}33`, borderRadius: 12, padding: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: accent, marginBottom: 8 }}>Celkem ({Math.round(rTotals.grams)} g):</div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <MacroLine label="Kalorie"   value={rTotals.kcal}    color={accent}    unit=" kcal" />
                    <MacroLine label="Sacharidy" value={rTotals.carbs}   color="#f59e0b"  unit="g" />
                    <MacroLine label="Bílkoviny" value={rTotals.protein} color="#22c55e"  unit="g" />
                    <MacroLine label="Tuky"      value={rTotals.fat}     color="#a855f7"  unit="g" />
                  </div>
                </div>
              )}

              {rIngs.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rSave}
                    onChange={e => setRSave(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: accent }}
                  />
                  <span style={{ fontSize: 13, color: T.muted }}>💾 Uložit jako jídlo pro příště</span>
                </label>
              )}
              <div style={inlineActionWrap}>
                {rEditId ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Btn accent={accent} size="lg" full onClick={() => handleRecipeConfirm(true)} disabled={!rName.trim() || rIngs.length === 0 || loading}>
                      {loading ? 'Ukládám…' : `Uložit a přidat do ${mealLabel}`}
                    </Btn>
                    <button
                      onClick={() => handleRecipeConfirm(false)}
                      disabled={!rName.trim() || loading}
                      style={{ width: '100%', padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: !rName.trim() || loading ? 'default' : 'pointer', background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, opacity: !rName.trim() || loading ? 0.5 : 1 }}
                    >
                      Jen uložit změny
                    </button>
                  </div>
                ) : (
                  <Btn accent={accent} size="lg" full onClick={() => handleRecipeConfirm(true)} disabled={!rName.trim() || rIngs.length === 0 || loading}>
                    {loading ? 'Přidávám…' : `+ Přidat do ${mealLabel}`}
                  </Btn>
                )}
              </div>
            </>
          )}

          {/* ── SAVED PORTION ── */}
          {step === 'saved_portion' && savedMealSel && (() => {
            const ratio  = savedMealGrams / savedMealSel.totalGrams;
            const scaled = {
              kcal:    savedMealSel.kcal    * ratio,
              carbs:   savedMealSel.carbs   * ratio,
              protein: savedMealSel.protein * ratio,
              fat:     savedMealSel.fat     * ratio,
            };
            return (
              <>
                {/* Reference portion info */}
                <div style={{ background: T.bg, borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: T.muted, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>Ref. ({savedMealSel.totalGrams} g):</span>
                  <span><b style={{ color: accent }}>{savedMealSel.kcal.toFixed(0)}</b> kcal</span>
                  <span><b style={{ color: '#f59e0b' }}>{savedMealSel.carbs.toFixed(0)}g</b> sacharidy</span>
                  <span><b style={{ color: '#22c55e' }}>{savedMealSel.protein.toFixed(0)}g</b> bílkoviny</span>
                  <span><b style={{ color: '#a855f7' }}>{savedMealSel.fat.toFixed(0)}g</b> tuky</span>
                </div>

                {/* Gram picker */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 13, color: T.muted }}>Množství</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => setSavedMealGrams(g => Math.max(5, g - 5))}
                        style={{ width: 26, height: 26, borderRadius: 6, background: T.border, border: 'none', color: T.text, cursor: 'pointer', fontSize: 16 }}>−</button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <input
                          type="number" inputMode="numeric" value={savedMealGrams} min={5} max={2000}
                          onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) setSavedMealGrams(Math.min(2000, Math.max(5, v))); }}
                          style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: T.text, width: 60, textAlign: 'center', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none', padding: '2px 4px' }}
                        />
                        <span style={{ fontSize: 13, color: T.muted }}>g</span>
                      </div>
                      <button onClick={() => setSavedMealGrams(g => Math.min(2000, g + 5))}
                        style={{ width: 26, height: 26, borderRadius: 6, background: accent + '22', border: `1px solid ${accent}44`, color: accent, cursor: 'pointer', fontSize: 16 }}>+</button>
                    </div>
                  </div>
                  <input type="range" min={5} max={2000} step={5} value={savedMealGrams}
                    onChange={e => setSavedMealGrams(Number(e.target.value))}
                    style={{ background: `linear-gradient(to right, ${accent} ${((savedMealGrams - 5) / 1995) * 100}%, ${T.border} 0%)`, borderRadius: 3 }} />
                </div>

                {/* Scaled nutrition preview */}
                <div style={{ background: accent + '12', border: `1px solid ${accent}33`, borderRadius: 12, padding: 14, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                    Nutriční hodnoty pro {savedMealGrams} g
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: T.text }}>
                      {scaled.kcal.toFixed(0)}
                    </span>
                    <span style={{ fontSize: 12, color: T.muted, alignSelf: 'flex-end', marginBottom: 4 }}>kcal</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <MacroLine label="Sacharidy" value={scaled.carbs}   color={BRAND.gold}   unit="g" />
                    <MacroLine label="Bílkoviny" value={scaled.protein} color={BRAND.green}  unit="g" />
                    <MacroLine label="Tuky"      value={scaled.fat}     color={BRAND.orange} unit="g" />
                  </div>
                </div>
                <div style={inlineActionWrap}>
                  <Btn accent={accent} size="lg" full onClick={handleSavedMealConfirm} disabled={loading}>
                    {loading ? 'Přidávám…' : `+ Přidat do ${mealLabel}`}
                  </Btn>
                </div>
              </>
            );
          })()}

        </div>
        {footer}
      </div>

      {showScanner && (
        <BarcodeScanner accent={accent} onResult={handleBarcodeResult} onClose={() => setShowScanner(false)} />
      )}

      {showFoodScanner && (
        <FoodScanner
          accent={accent}
          userId={userId}
          date={date}
          mealSlot={mealSlot}
          onResult={handleFoodScanResult}
          onClose={() => setShowFoodScanner(false)}
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
  const { accent, entries, addEntry, removeEntry, updateEntry, updateEntryMacros, userId, today, goals } = ctx;

  const [activePicker,  setActivePicker]  = useState<string | null>(null);
  const [confirmDel,    setConfirmDel]    = useState<string | null>(null);
  const [editingEntry,  setEditingEntry]  = useState<string | null>(null);
  const [editGrams,     setEditGrams]     = useState(100);
  const [editMealSlot,  setEditMealSlot]  = useState('');
  const [savingEdit,    setSavingEdit]    = useState(false);
  const [editIngredients, setEditIngredients] = useState<{name:string;grams:number;kcalPer100g:number}[]>([]);
  const [ingMode,         setIngMode]         = useState(false);
  const [ingAddName,      setIngAddName]      = useState('');
  const [ingAddGrams,     setIngAddGrams]     = useState('');
  const [ingAddKcal,      setIngAddKcal]      = useState('');
  const [customFoods,   setCustomFoods]   = useState<Food[]>(() => {
    try { return JSON.parse(localStorage.getItem('cyclofuel_custom_foods') ?? '[]'); }
    catch { return []; }
  });
  const { savedMeals, saveMeal, updateMeal, deleteMeal } = useSavedMeals();

  const allFoods = useMemo(() => {
    // Deduplicate by ID — FOODS take priority, customFoods fill in anything extra
    const seen = new Set<string>();
    const result: Food[] = [];
    for (const f of [...FOODS, ...customFoods]) {
      if (!seen.has(f.id)) { seen.add(f.id); result.push(f); }
    }
    return result;
  }, [customFoods]);

  const saveCustomFood = (food: Food) => {
    const updated = [...customFoods, food];
    localStorage.setItem('cyclofuel_custom_foods', JSON.stringify(updated));
    setCustomFoods(updated);
  };

  const startEdit = (id: string, currentGrams: number, currentMealSlot: string, entry: FoodEntry) => {
    setEditingEntry(id);
    setEditGrams(currentGrams);
    setEditMealSlot(currentMealSlot);
    setConfirmDel(null);
    setIngMode(false); setIngAddName(''); setIngAddGrams(''); setIngAddKcal('');
    try {
      const raw = localStorage.getItem(`cfi_${entry.id}`);
      if (raw) {
        setEditIngredients(JSON.parse(raw));
                setIngMode(true);
      } else {
        setEditIngredients([]);
      }
    } catch { setEditIngredients([]); }
  };
  const cancelEdit = () => { setEditingEntry(null); setIngMode(false); setIngAddName(''); setIngAddGrams(''); setIngAddKcal(''); };
  const saveIngredientEdit = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    setSavingEdit(true);
    const newKcal = editIngredients.reduce((s, ing) => s + ing.kcalPer100g * ing.grams / 100, 0);
    const ratio = entry.kcal > 0 ? newKcal / entry.kcal : 1;
    localStorage.setItem(`cfi_${entry.id}`, JSON.stringify(editIngredients));
    await updateEntryMacros(id, {
      kcal:    Math.round(newKcal),
      carbs:   parseFloat((entry.carbs   * ratio).toFixed(1)),
      protein: parseFloat((entry.protein * ratio).toFixed(1)),
      fat:     parseFloat((entry.fat     * ratio).toFixed(1)),
    }, editMealSlot);
    setSavingEdit(false);
    setEditingEntry(null);
    setIngMode(false);
  };
  const saveEdit   = async (id: string) => {
    setSavingEdit(true);
    await updateEntry(id, editGrams, editMealSlot);
    setSavingEdit(false);
    setEditingEntry(null);
  };
  const slotLabel = MEAL_SLOTS.find(s => s.id === activePicker)?.label ?? '';

  const entriesForSlot = (slotId: string) =>
    entries.filter(e => e.meal_slot === slotId);

  const slotKcal = (slotId: string) =>
    entriesForSlot(slotId).reduce((s, e) => s + e.kcal, 0);

  return (
    <div style={{ padding: '16px 16px 0', position: 'relative' }}>
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 300,
        background: 'radial-gradient(ellipse at top, rgba(255,214,0,0.06), transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
      <SectionTitle
        accent={BRAND.gold}
        right={
          <div style={{ fontSize: 12, color: BRAND.gold, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(ctx.totals.kcal)} / {Math.round(goals.kcal)} kcal
          </div>
        }
      >
        Jídelní deník
      </SectionTitle>

      {/* Overall progress bar */}
      <div style={{ marginBottom: 16 }}>
        <ProgressBar value={ctx.totals.kcal} max={goals.kcal} color={BRAND.gold} height={5} showLabel />
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
                    <span style={{ fontSize: 12, color: BRAND.gold, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round(kcal)} kcal
                    </span>
                  )}
                  <button
                    onClick={() => setActivePicker(slot.id)}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'rgba(255,214,0,0.08)', border: '1px solid rgba(255,214,0,0.2)',
                      color: BRAND.gold, fontSize: 18, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >+</button>
                </div>
              </div>

              {/* Food entries */}
              {slotEntries.map(entry => {
                const isEditing = editingEntry === entry.id;
                const previewKcal = entry.grams > 0
                  ? Math.round(entry.kcal / entry.grams * editGrams)
                  : 0;

                return (
                  <div key={entry.id}>
                    {/* Main row */}
                    <div
                      style={{
                        display:        'flex',
                        justifyContent: 'space-between',
                        alignItems:     'center',
                        padding:        '8px 14px',
                        borderBottom:   `1px solid ${T.border}`,
                        background:     isEditing ? accent + '08' : 'transparent',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.food_name}
                        </div>
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                          {entry.grams} g&nbsp;
                          <span style={{ color: BRAND.gold, marginRight: 4 }}>●</span>{entry.carbs.toFixed(0)}g&nbsp;
                          <span style={{ color: BRAND.green, marginRight: 4 }}>●</span>{entry.protein.toFixed(0)}g&nbsp;
                          <span style={{ color: BRAND.orange, marginRight: 4 }}>●</span>{entry.fat.toFixed(0)}g
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: accent }}>
                          {Math.round(entry.kcal)} kcal
                        </span>
                        {/* Edit / delete controls — mutually exclusive */}
                        {isEditing ? (
                          <button
                            onClick={cancelEdit}
                            style={{ background: 'none', border: 'none', color: T.muted, fontSize: 14, cursor: 'pointer', padding: 2, opacity: 0.6 }}
                          >✕</button>
                        ) : confirmDel === entry.id ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => { removeEntry(entry.id!); setConfirmDel(null); }}
                              style={{ background: '#ef444422', border: '1px solid #ef444444', borderRadius: 6, color: '#ef4444', fontSize: 11, padding: '3px 8px', cursor: 'pointer' }}
                            >Smazat</button>
                            <button
                              onClick={() => setConfirmDel(null)}
                              style={{ background: T.border, border: 'none', borderRadius: 6, color: T.muted, fontSize: 11, padding: '3px 8px', cursor: 'pointer' }}
                            >Zrušit</button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(entry.id!, entry.grams, entry.meal_slot, entry)}
                              title="Upravit gramáž"
                              style={{ background: 'none', border: 'none', color: T.muted, fontSize: 14, cursor: 'pointer', padding: 2, opacity: 0.7 }}
                            >✏️</button>
                            <button
                              onClick={() => setConfirmDel(entry.id!)}
                              style={{ background: 'none', border: 'none', color: T.muted, fontSize: 16, cursor: 'pointer', padding: 2, opacity: 0.6 }}
                            >✕</button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Inline editor */}
                    {isEditing && (
                      <div style={{ padding: '10px 14px 14px', borderBottom: `1px solid ${T.border}`, background: accent + '06' }}>
                        {/* Meal slot selector */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Přesunout do:</div>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {MEAL_SLOTS.map(slot => (
                              <button key={slot.id} onClick={() => setEditMealSlot(slot.id)}
                                style={{ padding: '4px 10px', borderRadius: 16, fontSize: 11, cursor: 'pointer', background: editMealSlot === slot.id ? accent : T.bg, border: `1px solid ${editMealSlot === slot.id ? accent : T.border}`, color: editMealSlot === slot.id ? '#fff' : T.muted }}>
                                {slot.icon} {slot.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Mode toggle */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                          <button onClick={() => setIngMode(false)}
                            style={{ flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: !ingMode ? accent + '22' : T.bg, border: `1px solid ${!ingMode ? accent : T.border}`, color: !ingMode ? accent : T.muted, fontWeight: !ingMode ? 700 : 400 }}>
                            ⚖️ Gramy
                          </button>
                          <button onClick={() => setIngMode(true)}
                            style={{ flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: ingMode ? accent + '22' : T.bg, border: `1px solid ${ingMode ? accent : T.border}`, color: ingMode ? accent : T.muted, fontWeight: ingMode ? 700 : 400 }}>
                            🥕 Ingredience
                          </button>
                        </div>

                        {ingMode ? (
                          /* ── Ingredient editor ── */
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                              {editIngredients.map((ing, i) => {
                                const ingKcal = Math.round(ing.kcalPer100g * ing.grams / 100);
                                return (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.bg, borderRadius: 8, padding: '6px 10px' }}>
                                    <span style={{ flex: 1, fontSize: 12, color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ing.name}</span>
                                    <button onClick={() => setEditIngredients(p => p.map((x, j) => j === i ? { ...x, grams: Math.max(5, x.grams - 5) } : x))}
                                      style={{ width: 22, height: 22, borderRadius: 5, background: T.border, border: 'none', color: T.text, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>−</button>
                                    <input type="number" inputMode="numeric" value={ing.grams} min={5}
                                      onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) setEditIngredients(p => p.map((x, j) => j === i ? { ...x, grams: v } : x)); }}
                                      style={{ width: 44, textAlign: 'center', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 3px', color: T.text, fontSize: 12, fontWeight: 600, outline: 'none' }} />
                                    <span style={{ fontSize: 10, color: T.muted, flexShrink: 0 }}>g</span>
                                    <button onClick={() => setEditIngredients(p => p.map((x, j) => j === i ? { ...x, grams: x.grams + 5 } : x))}
                                      style={{ width: 22, height: 22, borderRadius: 5, background: accent + '22', border: `1px solid ${accent}44`, color: accent, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>+</button>
                                    <span style={{ fontSize: 11, color: accent, fontWeight: 600, width: 46, textAlign: 'right', flexShrink: 0 }}>{ingKcal} kcal</span>
                                    <button onClick={() => setEditIngredients(p => p.filter((_, j) => j !== i))}
                                      style={{ background: '#ff6b6b22', border: '1px solid #ff6b6b44', borderRadius: 6, color: '#ff6b6b', width: 22, height: 22, cursor: 'pointer', fontSize: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Add ingredient form */}
                            <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center' }}>
                              <input placeholder="Název…" value={ingAddName} onChange={e => setIngAddName(e.target.value)}
                                style={{ flex: 2, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 8px', color: T.text, fontSize: 12, outline: 'none', minWidth: 0 }} />
                              <input type="number" inputMode="numeric" placeholder="g" value={ingAddGrams} onChange={e => setIngAddGrams(e.target.value)}
                                style={{ width: 46, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 4px', color: T.text, fontSize: 12, outline: 'none', textAlign: 'center' }} />
                              <input type="number" inputMode="numeric" placeholder="kcal/100g" value={ingAddKcal} onChange={e => setIngAddKcal(e.target.value)}
                                style={{ width: 72, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 4px', color: T.text, fontSize: 12, outline: 'none', textAlign: 'center' }} />
                              <button
                                disabled={!ingAddName.trim() || !ingAddGrams}
                                onClick={() => {
                                  setEditIngredients(p => [...p, { name: ingAddName.trim(), grams: parseInt(ingAddGrams) || 100, kcalPer100g: parseInt(ingAddKcal) || 0 }]);
                                  setIngAddName(''); setIngAddGrams(''); setIngAddKcal('');
                                }}
                                style={{ width: 28, height: 28, borderRadius: 7, background: accent, border: 'none', color: '#000', fontSize: 18, cursor: !ingAddName.trim() || !ingAddGrams ? 'default' : 'pointer', flexShrink: 0, opacity: !ingAddName.trim() || !ingAddGrams ? 0.4 : 1 }}>+</button>
                            </div>

                            {editIngredients.length > 0 && (
                              <div style={{ fontSize: 12, color: accent, fontWeight: 700, textAlign: 'right', marginBottom: 8 }}>
                                Celkem: {Math.round(editIngredients.reduce((s, ing) => s + ing.kcalPer100g * ing.grams / 100, 0))} kcal
                              </div>
                            )}
                          </>
                        ) : (
                          /* ── Gram editor ── */
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <button onClick={() => setEditGrams(g => Math.max(5, g - 5))}
                                style={{ width: 28, height: 28, borderRadius: 6, background: T.border, border: 'none', color: T.text, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>−</button>
                              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: T.text, minWidth: 54, textAlign: 'center' }}>{editGrams} g</span>
                              <button onClick={() => setEditGrams(g => Math.min(600, g + 5))}
                                style={{ width: 28, height: 28, borderRadius: 6, background: accent + '22', border: `1px solid ${accent}44`, color: accent, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>+</button>
                              <span style={{ flex: 1, textAlign: 'right', fontSize: 13, fontWeight: 600, color: accent }}>→ {previewKcal} kcal</span>
                            </div>
                            <input type="range" min={5} max={600} step={5} value={editGrams}
                              onChange={e => setEditGrams(Number(e.target.value))}
                              style={{ width: '100%', marginBottom: 10, background: `linear-gradient(to right, ${accent} ${((editGrams - 5) / 595) * 100}%, ${T.border} 0%)`, borderRadius: 3 }} />
                          </>
                        )}

                        {/* Save / Cancel */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => ingMode ? saveIngredientEdit(entry.id!) : saveEdit(entry.id!)}
                            disabled={savingEdit || (ingMode && editIngredients.length === 0)}
                            style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: accent, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: savingEdit ? 'default' : 'pointer', opacity: savingEdit || (ingMode && editIngredients.length === 0) ? 0.6 : 1 }}
                          >{savingEdit ? 'Ukládám…' : 'Uložit'}</button>
                          <button onClick={cancelEdit}
                            style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: T.border, border: 'none', color: T.muted, fontSize: 13, cursor: 'pointer' }}>Zrušit</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>
          </div>
        );
      })}

      {/* Totals bar */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <TotalItem label="Celkem"    value={`${Math.round(ctx.totals.kcal)} kcal`}    color={BRAND.gold}   />
          <TotalItem label="Sacharidy" value={`${ctx.totals.carbs.toFixed(0)} g`}        color={BRAND.gold}   />
          <TotalItem label="Bílkoviny" value={`${ctx.totals.protein.toFixed(0)} g`}      color={BRAND.green}  />
          <TotalItem label="Tuky"      value={`${ctx.totals.fat.toFixed(0)} g`}          color={BRAND.orange} />
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
          allFoods={allFoods}
          savedMeals={savedMeals}
          onSaveCustomFood={saveCustomFood}
          onSaveMeal={saveMeal}
          onUpdateSavedMeal={updateMeal}
          onDeleteSavedMeal={deleteMeal}
          onClose={() => setActivePicker(null)}
          onConfirm={addEntry}
        />
      )}
      </div>
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
