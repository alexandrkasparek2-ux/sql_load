import { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext, DEFICIT_KCAL } from '../App';
import { T, BRAND, MACRO, Card, SectionTitle, ProgressBar, Btn, SegmentedTabs, MetricBox } from '../components/UI';
import { showToast }    from '../components/Toast';
import { FOODS, FOOD_CATEGORIES, type Food } from '../constants/foods';
import { MEAL_SLOTS }    from '../constants/training';
import type { FoodEntry } from '../hooks/useFoodEntries';
import { useSavedMeals, type SavedMeal } from '../hooks/useSavedMeals';
import { useUserSetting } from '../hooks/useUserSetting';
import BarcodeScanner    from '../components/BarcodeScanner';
import FoodScanner      from '../components/FoodScanner';
import { MealBuilder, type MealSuggestion } from '../components/performance-ui';
import { useTrainingPhase } from '../hooks/useTrainingPhase';
import { useDailyNutritionTarget } from '../hooks/useDailyNutritionTarget';
import { useTrainingPlan } from '../hooks/useTrainingPlan';
import { useIntervalsData } from '../hooks/useIntervalsData';

// ─── helpers ────────────────────────────────────────────────
function scaleNutrient(val: number, grams: number) {
  return parseFloat((val * grams / 100).toFixed(2));
}

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1280;
  });
  type Step = 'browse' | 'portion' | 'custom' | 'recipe' | 'saved_portion';
  const [step,        setStep]        = useState<Step>('browse');
  // browse / portion
  const [selCat,      setSelCat]      = useState('');
  const [search,      setSearch]      = useState('');
  const [food,        setFood]        = useState<Food | null>(null);
  const [grams,       setGrams]       = useState(100);
  const [gramsInput,  setGramsInput]  = useState('100');
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
  const [cGramsInput, setCGramsInput] = useState('100');
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
  const [savedMealGramsInput, setSavedMealGramsInput] = useState('100');

  useEffect(() => {
    setGramsInput(String(grams));
  }, [grams]);

  useEffect(() => {
    setCGramsInput(String(cGrams));
  }, [cGrams]);

  useEffect(() => {
    setSavedMealGramsInput(String(savedMealGrams));
  }, [savedMealGrams]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(min-width: 1280px)');
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

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

  const commitGramsInput = () => {
    const parsed = parseInt(gramsInput, 10);
    const next = Number.isNaN(parsed) ? grams : clampInt(parsed, 5, 600);
    setGrams(next);
    setGramsInput(String(next));
  };

  const commitCustomGramsInput = () => {
    const parsed = parseInt(cGramsInput, 10);
    const next = Number.isNaN(parsed) ? cGrams : clampInt(parsed, 5, 1000);
    setCGrams(next);
    setCGramsInput(String(next));
  };

  const commitSavedMealGramsInput = () => {
    const parsed = parseInt(savedMealGramsInput, 10);
    const next = Number.isNaN(parsed) ? savedMealGrams : clampInt(parsed, 5, 2000);
    setSavedMealGrams(next);
    setSavedMealGramsInput(String(next));
  };

  const handleSelectFood = (f: Food) => {
    setFood(f);
    setGrams(f.per);
    setGramsInput(String(f.per));
    setStep('portion');
  };
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
    showToast(`${food.name} přidáno`);
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
    showToast(`${rName.trim() || 'Recept'} přidán`);
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
    showToast(`${savedMealSel.name} přidáno`);
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

      {/* Picker shell */}
      <div style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        width: isDesktop ? 'min(1040px, calc(100vw - 64px))' : '100%',
        maxWidth: isDesktop ? 1040 : 500,
        bottom: isDesktop ? 'auto' : 0,
        top: isDesktop ? 32 : 'auto',
        background: T.card,
        borderRadius: isDesktop ? 24 : '20px 20px 0 0',
        border: `1px solid ${T.border}`,
        borderBottom: isDesktop ? `1px solid ${T.border}` : 'none',
        zIndex: 101,
        height: isDesktop ? 'min(880px, calc(100dvh - 64px))' : 'min(88dvh, calc(100dvh - 12px))',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isDesktop ? '0 40px 120px rgba(0,0,0,0.45)' : undefined,
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, opacity: isDesktop ? 0 : 1 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border }} />
        </div>

        {/* Header */}
        <div style={{ padding: isDesktop ? '18px 22px 16px' : '10px 16px 12px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: isDesktop ? 20 : 16, fontWeight: 700, color: T.text }}>
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
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: isDesktop ? '18px 22px 22px' : '12px 16px 16px' }}>

          {/* ── BROWSE ── */}
          {step === 'browse' && (
            <>
              {isDesktop && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 300px',
                  gap: 18,
                  marginBottom: 18,
                  padding: 16,
                  borderRadius: 18,
                  border: `1px solid ${T.border}`,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>
                      Desktop picker
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.04em', marginBottom: 6 }}>
                      Vyber jídlo pro {mealLabel.toLowerCase()}
                    </div>
                    <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                      Na notebooku je picker širší a počítá s rychlým hledáním, vlastními jídly i recepty bez bottom-sheet pocitu.
                    </div>
                  </div>
                  <Card style={{ padding: 16, margin: 0 }}>
                    <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
                      Rychlé akce
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <button
                        onClick={() => setStep('custom')}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 13, cursor: 'pointer', background: accent + '18', border: `1px solid ${accent}33`, color: accent, fontWeight: 600, textAlign: 'left' }}
                      >
                        ✏️ Vlastní jídlo
                      </button>
                      <button
                        onClick={() => setStep('recipe')}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 13, cursor: 'pointer', background: T.bg, border: `1px solid ${T.border}`, color: T.text, textAlign: 'left' }}
                      >
                        🍳 Složit recept
                      </button>
                    </div>
                  </Card>
                </div>
              )}

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
              <div style={{
                display: 'grid',
                gridTemplateColumns: isDesktop ? 'repeat(2, minmax(0, 1fr))' : '1fr',
                gap: 6,
              }}>
                {!search && !selCat && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: T.muted, padding: '30px 0', fontSize: 14 }}>
                    🔍 Vyhledej potravinu nebo vyber kategorii
                  </div>
                )}
                {(search || selCat) && filtered.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: T.muted, padding: '30px 0', fontSize: 14 }}>Žádná potravina nenalezena.</div>
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
                    <button onClick={() => setGrams(g => clampInt(g - 5, 5, 600))} style={{ width: 26, height: 26, borderRadius: 6, background: T.border, border: 'none', color: T.text, cursor: 'pointer', fontSize: 16 }}>−</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <input
                        type="number" inputMode="numeric" value={gramsInput} min={5} max={600}
                        onChange={e => setGramsInput(e.target.value)}
                        onBlur={commitGramsInput}
                        onKeyDown={e => { if (e.key === 'Enter') commitGramsInput(); }}
                        style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: T.text, width: 52, textAlign: 'center', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none', padding: '2px 4px' }}
                      />
                      <span style={{ fontSize: 13, color: T.muted }}>g</span>
                    </div>
                    <button onClick={() => setGrams(g => clampInt(g + 5, 5, 600))} style={{ width: 26, height: 26, borderRadius: 6, background: accent + '22', border: `1px solid ${accent}44`, color: accent, cursor: 'pointer', fontSize: 16 }}>+</button>
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
                    <button onClick={() => setCGrams(g => clampInt(g - 5, 5, 1000))} style={{ width: 26, height: 26, borderRadius: 6, background: T.border, border: 'none', color: T.text, cursor: 'pointer', fontSize: 16 }}>−</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <input
                        type="number" inputMode="numeric" value={cGramsInput} min={5} max={1000}
                        onChange={e => setCGramsInput(e.target.value)}
                        onBlur={commitCustomGramsInput}
                        onKeyDown={e => { if (e.key === 'Enter') commitCustomGramsInput(); }}
                        style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: T.text, width: 52, textAlign: 'center', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none', padding: '2px 4px' }}
                      />
                      <span style={{ fontSize: 13, color: T.muted }}>g</span>
                    </div>
                    <button onClick={() => setCGrams(g => clampInt(g + 5, 5, 1000))} style={{ width: 26, height: 26, borderRadius: 6, background: accent + '22', border: `1px solid ${accent}44`, color: accent, cursor: 'pointer', fontSize: 16 }}>+</button>
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
                      <button onClick={() => setSavedMealGrams(g => clampInt(g - 5, 5, 2000))}
                        style={{ width: 26, height: 26, borderRadius: 6, background: T.border, border: 'none', color: T.text, cursor: 'pointer', fontSize: 16 }}>−</button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <input
                          type="number" inputMode="numeric" value={savedMealGramsInput} min={5} max={2000}
                          onChange={e => setSavedMealGramsInput(e.target.value)}
                          onBlur={commitSavedMealGramsInput}
                          onKeyDown={e => { if (e.key === 'Enter') commitSavedMealGramsInput(); }}
                          style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: T.text, width: 60, textAlign: 'center', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none', padding: '2px 4px' }}
                        />
                        <span style={{ fontSize: 13, color: T.muted }}>g</span>
                      </div>
                      <button onClick={() => setSavedMealGrams(g => clampInt(g + 5, 5, 2000))}
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
  const { accent, entries, addEntry, removeEntry, updateEntry, updateEntryMacros, userId, today, goals, setToday, profile, deficitLevel } = ctx;

  const { phaseInfo } = useTrainingPhase(userId);
  const { todayWorkout } = useTrainingPlan();
  const { activities: intervalsActivities } = useIntervalsData(1, userId);
  const deficitKcal = DEFICIT_KCAL[deficitLevel] ?? 0;
  const todayTSS = intervalsActivities
    .filter(a => a.start_date_local.startsWith(today))
    .reduce((sum, a) => sum + (a.icu_training_load ?? 0), 0)
    || (todayWorkout?.tss ?? 0);
  const { target: nutritionTarget } = useDailyNutritionTarget({
    profile,
    phaseInfo,
    tss: todayTSS,
    garminKj: null,
    caloricDeficit: deficitKcal,
  });
  const effectiveGoals = nutritionTarget ? {
    ...goals,
    kcal:    nutritionTarget.kcal,
    carbs:   nutritionTarget.carbs_g,
    protein: nutritionTarget.protein_g,
    fat:     nutritionTarget.fat_g,
  } : goals;

  const realToday = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const isViewingToday = today === realToday;

  const shiftDay = (delta: number) => {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const next = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    setToday(next);
  };

  const CS_DAYS  = ['Ne','Po','Út','St','Čt','Pá','So'];
  const CS_MONTHS = ['led','úno','bře','dub','kvě','čvn','čvc','srp','zář','říj','lis','pro'];
  const viewedDate = new Date(today + 'T00:00:00');
  const dayLabel = `${CS_DAYS[viewedDate.getDay()]} ${viewedDate.getDate()}. ${CS_MONTHS[viewedDate.getMonth()]}.`;
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1280;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(min-width: 1280px)');
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const [activeTab, setActiveTab] = useState<'denik' | 'meal_builder'>('denik');
  const [innerTab, setInnerTab] = useState<'diary' | 'builder'>('diary');
  const [activePicker,  setActivePicker]  = useState<string | null>(null);
  const [confirmDel,    setConfirmDel]    = useState<string | null>(null);
  const [editingEntry,  setEditingEntry]  = useState<string | null>(null);
  const [editGrams,     setEditGrams]     = useState(100);
  const [editMealSlot,  setEditMealSlot]  = useState('');
  const [savingEdit,    setSavingEdit]    = useState(false);
  const [editIngredients, setEditIngredients] = useState<{name:string;grams:number;kcalPer100g:number}[]>([]);
  const [ingMode,         setIngMode]         = useState(false);
  const [showSlotPicker,  setShowSlotPicker]  = useState(false);

  const SLOT_TIMES: Record<string, string> = {
    snidane: '07:30', dop_svacina: '10:00', obed: '12:30',
    odp_svacina: '15:00', pred_tren: '16:30', behem_tren: '17:00',
    po_tren: '19:00', vecere: '20:30',
  };
  const [ingAddName,      setIngAddName]      = useState('');
  const [ingAddGrams,     setIngAddGrams]     = useState('');
  const [ingAddKcal,      setIngAddKcal]      = useState('');
  const { value: customFoods, setValue: setCustomFoods } = useUserSetting<Food[]>(
    userId,
    'custom_foods',
    [],
    {
      legacyKey: 'cyclofuel_custom_foods',
      isEmpty: value => value.length === 0,
    },
  );
  const { savedMeals, saveMeal, updateMeal, deleteMeal } = useSavedMeals(userId);

  const allFoods = useMemo(() => {
    // Deduplicate by ID — FOODS take priority, customFoods fill in anything extra
    const seen = new Set<string>();
    const result: Food[] = [];
    for (const f of [...FOODS, ...customFoods]) {
      if (!seen.has(f.id)) { seen.add(f.id); result.push(f); }
    }
    return result;
  }, [customFoods]);

  const remaining = {
    kcal: Math.max(0, effectiveGoals.kcal - ctx.totals.kcal),
    carbs: Math.max(0, effectiveGoals.carbs - ctx.totals.carbs),
    protein: Math.max(0, effectiveGoals.protein - ctx.totals.protein),
    fat: Math.max(0, effectiveGoals.fat - ctx.totals.fat),
  };

  const mealBuilderSuggestions = useMemo<MealSuggestion[]>(() => {
    return allFoods
      .filter(food => food.kcal > 0 && food.per > 0)
      .map(food => {
        const factor = food.per / 100;
        const carbs = food.carbs * factor;
        const protein = food.protein * factor;
        const fat = food.fat * factor;
        const kcal = food.kcal * factor;
        const coverage =
          Math.min(carbs / Math.max(remaining.carbs, 1), 1) +
          Math.min(protein / Math.max(remaining.protein, 1), 1) +
          Math.min(fat / Math.max(remaining.fat, 1), 1);
        const match: MealSuggestion['match'] = coverage > 2.1 ? 'perfect' : coverage > 1.25 ? 'good' : 'partial';
        return {
          name: food.name,
          weight: `${food.per} g`,
          kcal,
          carbs,
          protein,
          fat,
          match,
          score: coverage - (remaining.kcal > 0 && kcal > remaining.kcal * 1.4 ? 0.5 : 0),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [allFoods, remaining.carbs, remaining.fat, remaining.kcal, remaining.protein]);

  const saveCustomFood = (food: Food) => {
    const updated = [...customFoods, food];
    void setCustomFoods(updated);
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
    <div style={{ padding: isDesktop ? '0 0 12px' : '16px 16px 0', position: 'relative' }}>
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 300,
        background: 'radial-gradient(ellipse at top, rgba(124,92,255,0.06), transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {isDesktop && (
          <div style={{ marginBottom: 16 }}>
            <SegmentedTabs
              tabs={[
                { id: 'denik', label: 'Deník' },
                { id: 'meal_builder', label: 'Meal Builder' },
              ]}
              active={activeTab}
              onChange={(id) => setActiveTab(id as 'denik' | 'meal_builder')}
            />
          </div>
        )}

      {isDesktop && activeTab === 'meal_builder' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card style={{ borderColor: `${BRAND.green}30` }}>
            <div style={{ fontSize: 11, color: BRAND.green, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Meal Builder
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 8, letterSpacing: '-0.03em' }}>
              Sestav jídelníček na celý den
            </div>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, marginBottom: 16 }}>
              Otevři AI poradce a napiš: <span style={{ color: T.text }}>"Vygeneruj jídelníček na celý den"</span>. Doporučím konkrétní jídla pro všechny sloty s makry přesně na tvoje cíle.
            </div>
            <Btn accent={BRAND.green} full onClick={() => { window.location.href = '/chat'; }}>
              Otevřít AI poradce
            </Btn>
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <MetricBox label="Cíl kcal" value={Math.round(effectiveGoals.kcal)} unit="kcal" color={BRAND.gold} />
            <MetricBox label="Zbývá" value={Math.max(0, Math.round(effectiveGoals.kcal - ctx.totals.kcal))} unit="kcal" color={BRAND.orange} />
            <MetricBox label="Sacharidy" value={`${ctx.totals.carbs.toFixed(0)}/${effectiveGoals.carbs}`} unit="g" color={BRAND.gold} />
            <MetricBox label="Bílkoviny" value={`${ctx.totals.protein.toFixed(0)}/${effectiveGoals.protein}`} unit="g" color={BRAND.green} />
          </div>
        </div>
      )}

      {(!isDesktop || activeTab === 'denik') && (
      <>{isDesktop ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20, alignItems: 'start', marginBottom: 18 }}>
          <div>
            <SectionTitle
              accent={BRAND.gold}
              right={
                <div style={{ fontSize: 12, color: BRAND.gold, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(ctx.totals.kcal)} / {Math.round(effectiveGoals.kcal)} kcal
                </div>
              }
            >
              Jídelní deník
            </SectionTitle>
            <div style={{ marginBottom: 16 }}>
              <ProgressBar value={ctx.totals.kcal} max={effectiveGoals.kcal} color={BRAND.gold} height={6} showLabel />
            </div>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
              Notebooková verze ti dává rychlejší přehled nad celým dnem. Jednotlivé sloty jsou rozložené do pracovního gridu, aby šlo snadněji zapisovat a upravovat více jídel najednou.
            </div>
          </div>

          <Card style={{
            padding: 18,
            borderRadius: 20,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
          }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>
              Souhrn dne
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { label: 'Kalorie', value: `${Math.round(ctx.totals.kcal)} kcal`, color: BRAND.gold },
                { label: 'Sacharidy', value: `${ctx.totals.carbs.toFixed(0)} g`, color: BRAND.gold },
                { label: 'Bílkoviny', value: `${ctx.totals.protein.toFixed(0)} g`, color: BRAND.green },
                { label: 'Tuky', value: `${ctx.totals.fat.toFixed(0)} g`, color: BRAND.orange },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: 10,
                  borderBottom: `1px solid ${T.border}`,
                }}>
                  <span style={{ fontSize: 12, color: T.muted }}>{item.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <>
          {/* LAB Header */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: T.muted, fontFamily: 'JetBrains Mono, monospace', marginBottom: 3 }}>
                  DENNÍ NUTRIČNÍ PLÁN
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                  Jídla
                </div>
              </div>
              <button
                onClick={() => setShowSlotPicker(true)}
                style={{ padding: '8px 16px', background: BRAND.purple, border: 'none', borderRadius: 20, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                + PŘIDAT
              </button>
            </div>
            {/* Date navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '6px 8px' }}>
              <button
                onClick={() => shiftDay(-1)}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', color: T.muted, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >‹</button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: T.text }}>
                  {dayLabel}
                </span>
                {isViewingToday && (
                  <span style={{ marginLeft: 8, fontSize: 9, fontFamily: 'JetBrains Mono, monospace', background: BRAND.purple + '22', color: BRAND.purple, padding: '2px 6px', borderRadius: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
                    DNES
                  </span>
                )}
              </div>
              <button
                onClick={() => shiftDay(1)}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', color: T.muted, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >›</button>
            </div>
          </div>

          {/* Calorie summary card */}
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 42, lineHeight: 1, fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: T.text }}>
                  {Math.round(ctx.totals.kcal)}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: T.muted, marginTop: 3 }}>
                  / {Math.round(effectiveGoals.kcal)} kcal
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: T.muted, fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>ZBÝVÁ</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: BRAND.purple, fontFamily: "'Space Grotesk', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
                  {Math.max(0, Math.round(effectiveGoals.kcal - ctx.totals.kcal))}
                </div>
              </div>
            </div>
            <div style={{ height: 3, background: T.border, borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, effectiveGoals.kcal > 0 ? (ctx.totals.kcal / effectiveGoals.kcal) * 100 : 0)}%`, background: BRAND.purple, borderRadius: 2, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'SACH', val: ctx.totals.carbs,   goal: effectiveGoals.carbs,   color: MACRO.carb },
                { label: 'BÍLK', val: ctx.totals.protein, goal: effectiveGoals.protein, color: MACRO.pro  },
                { label: 'TUKY', val: ctx.totals.fat,     goal: effectiveGoals.fat,     color: MACRO.fat  },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: T.muted, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>{m.label}</span>
                    <span style={{ fontSize: 9, color: T.muted, fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }}>{Math.round(m.val)}g</span>
                  </div>
                  <div style={{ height: 3, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, m.goal > 0 ? (m.val / m.goal) * 100 : 0)}%`, background: m.color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline header */}
          <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: T.muted, fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>
            DNEŠNÍ ROZPIS · {entries.length} {entries.length === 1 ? 'JÍDLO' : 'JÍDEL'}
          </div>

          {/* Vertical timeline */}
          <div style={{ marginBottom: 24 }}>
            {MEAL_SLOTS.map((slot, idx) => {
              const slotEntries = entriesForSlot(slot.id);
              const kcal = slotKcal(slot.id);
              const slotTime = SLOT_TIMES[slot.id] ?? '';
              const isLast = idx === MEAL_SLOTS.length - 1;
              const hasEditing = slotEntries.some(e => editingEntry === e.id);

              return (
                <div key={slot.id} style={{ display: 'flex', gap: 10, paddingBottom: isLast ? 0 : 4 }}>
                  {/* Time column */}
                  <div style={{ width: 36, flexShrink: 0, textAlign: 'right' as const, paddingTop: 2 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: T.muted, lineHeight: '16px' }}>
                      {slotTime}
                    </span>
                  </div>
                  {/* Dot + line */}
                  <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', width: 14, flexShrink: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: slotEntries.length > 0 ? BRAND.purple : T.border, flexShrink: 0, marginTop: 4 }} />
                    {!isLast && <div style={{ width: 1, flex: 1, minHeight: 24, background: T.border, marginTop: 3 }} />}
                  </div>
                  {/* Slot content */}
                  <div style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: slotEntries.length > 0 ? 7 : 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: slotEntries.length > 0 ? T.text : T.muted, lineHeight: '16px' }}>
                        {slot.label}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {kcal > 0 && (
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: BRAND.gold, fontWeight: 700 }}>
                            {Math.round(kcal)} kcal
                          </span>
                        )}
                        <button
                          onClick={() => setActivePicker(slot.id)}
                          style={{ width: 22, height: 22, borderRadius: 5, background: 'rgba(124,92,255,0.1)', border: '1px solid rgba(124,92,255,0.2)', color: BRAND.purple, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                        >+</button>
                      </div>
                    </div>

                    {/* Food chips */}
                    {slotEntries.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5, marginBottom: hasEditing ? 10 : 0 }}>
                        {slotEntries.map(entry => {
                          const isEditing = editingEntry === entry.id;
                          return (
                            <div
                              key={entry.id}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: isEditing ? `${BRAND.purple}22` : T.border, border: `1px solid ${isEditing ? BRAND.purple : 'transparent'}`, borderRadius: 20, padding: '3px 8px 3px 10px', cursor: 'pointer' }}
                              onClick={() => isEditing ? cancelEdit() : startEdit(entry.id!, entry.grams, entry.meal_slot, entry)}
                            >
                              <span style={{ fontSize: 11, color: T.text, fontWeight: 500, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                {entry.food_name}
                              </span>
                              <span style={{ fontSize: 10, color: T.muted }}>{Math.round(entry.kcal)}k</span>
                              {confirmDel === entry.id ? (
                                <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
                                  <button onClick={() => { removeEntry(entry.id!); setConfirmDel(null); }}
                                    style={{ background: '#ef444422', border: 'none', borderRadius: 4, color: '#ef4444', fontSize: 9, padding: '1px 5px', cursor: 'pointer' }}>✕</button>
                                  <button onClick={() => setConfirmDel(null)}
                                    style={{ background: T.border, border: 'none', borderRadius: 4, color: T.muted, fontSize: 9, padding: '1px 5px', cursor: 'pointer' }}>—</button>
                                </div>
                              ) : (
                                <button
                                  onClick={e => { e.stopPropagation(); setConfirmDel(entry.id!); }}
                                  style={{ background: 'none', border: 'none', color: T.muted, fontSize: 12, cursor: 'pointer', padding: '0 1px', lineHeight: 1, flexShrink: 0 }}
                                >×</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Inline gram editor (mobile) */}
                    {hasEditing && (() => {
                      const entry = slotEntries.find(e => editingEntry === e.id)!;
                      const previewKcal = entry.grams > 0 ? Math.round(entry.kcal / entry.grams * editGrams) : 0;
                      return (
                        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: '10px 12px' }}>
                          <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, fontWeight: 600 }}>{entry.food_name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <button onClick={() => setEditGrams(g => Math.max(5, g - 5))}
                              style={{ width: 28, height: 28, borderRadius: 6, background: T.border, border: 'none', color: T.text, cursor: 'pointer', fontSize: 16 }}>−</button>
                            <span style={{ fontSize: 16, fontWeight: 700, color: T.text, minWidth: 54, textAlign: 'center' as const, fontVariantNumeric: 'tabular-nums' }}>{editGrams} g</span>
                            <button onClick={() => setEditGrams(g => Math.min(600, g + 5))}
                              style={{ width: 28, height: 28, borderRadius: 6, background: `${BRAND.purple}22`, border: `1px solid ${BRAND.purple}44`, color: BRAND.purple, cursor: 'pointer', fontSize: 16 }}>+</button>
                            <span style={{ flex: 1, textAlign: 'right' as const, fontSize: 13, fontWeight: 600, color: BRAND.purple, fontVariantNumeric: 'tabular-nums' }}>→ {previewKcal} kcal</span>
                          </div>
                          <input type="range" min={5} max={600} step={5} value={editGrams}
                            onChange={e => setEditGrams(Number(e.target.value))}
                            style={{ width: '100%', marginBottom: 10 }} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => saveEdit(entry.id!)} disabled={savingEdit}
                              style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: BRAND.purple, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: savingEdit ? 0.6 : 1 }}>
                              {savingEdit ? 'Ukládám…' : 'Uložit'}
                            </button>
                            <button onClick={cancelEdit}
                              style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: T.border, border: 'none', color: T.muted, fontSize: 13, cursor: 'pointer' }}>
                              Zrušit
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Slot picker bottom sheet */}
          {showSlotPicker && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
              onClick={() => setShowSlotPicker(false)}>
              <div style={{ width: '100%', background: T.card, borderRadius: '20px 20px 0 0', padding: '20px 20px 32px' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: T.muted, fontFamily: 'JetBrains Mono, monospace', marginBottom: 14 }}>
                  PŘIDAT DO JÍDLA
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {MEAL_SLOTS.map(s => {
                    const sKcal = slotKcal(s.id);
                    return (
                      <button key={s.id}
                        onClick={() => { setActivePicker(s.id); setShowSlotPicker(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, cursor: 'pointer', textAlign: 'left' as const }}>
                        <span style={{ fontSize: 18 }}>{s.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{s.label}</div>
                          <div style={{ fontSize: 10, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>{SLOT_TIMES[s.id] ?? ''}</div>
                        </div>
                        {sKcal > 0 && (
                          <div style={{ fontSize: 11, color: BRAND.gold, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                            {Math.round(sKcal)} kcal
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {isDesktop && (
      <SegmentedTabs
        tabs={[
          { id: 'diary', label: 'Deník' },
          { id: 'builder', label: 'Meal Builder' },
        ]}
        active={innerTab}
        onChange={(id) => setInnerTab(id as 'diary' | 'builder')}
      />
      )}

      {isDesktop && (innerTab === 'builder' ? (
        <div style={{ maxWidth: isDesktop ? 760 : 'none', marginBottom: 16 }}>
          <MealBuilder remaining={remaining} suggestions={mealBuilderSuggestions} />
        </div>
      ) : (
      <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? 'repeat(2, minmax(0, 1fr))' : '1fr',
        gap: 12,
        alignItems: 'start',
      }}>
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
                      background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.2)',
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

      </div>

      {/* Totals bar */}
      <Card style={{ marginBottom: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <TotalItem label="Celkem"    value={`${Math.round(ctx.totals.kcal)} kcal`}    color={BRAND.gold}   />
          <TotalItem label="Sacharidy" value={`${ctx.totals.carbs.toFixed(0)} g`}        color={BRAND.gold}   />
          <TotalItem label="Bílkoviny" value={`${ctx.totals.protein.toFixed(0)} g`}      color={BRAND.green}  />
          <TotalItem label="Tuky"      value={`${ctx.totals.fat.toFixed(0)} g`}          color={BRAND.orange} />
        </div>
      </Card>

      </>
      ))}
      </> )} {/* end activeTab === 'denik' */}

      </div>
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
