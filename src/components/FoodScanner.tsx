import { useState, useRef, useCallback } from 'react';
import { T, Spinner } from './UI';
import type { FoodEntry } from '../hooks/useFoodEntries';

// ─── colors ─────────────────────────────────────────────────
const C = {
  green:  '#00e676',
  blue:   '#40c4ff',
  orange: '#ffab40',
  red:    '#ff6b6b',
  purple: '#b39ddb',
  muted:  '#64748b',
};

const CAT_COLOR: Record<string, string> = {
  protein: C.red, carb: C.blue, fat: C.orange,
  vegetable: C.green, fruit: '#ff9800', dairy: C.purple, other: C.muted,
};
const CAT_EMOJI: Record<string, string> = {
  protein: '🥩', carb: '🍚', fat: '🫒',
  vegetable: '🥦', fruit: '🍌', dairy: '🥛', other: '🍽️',
};
const CAT_LABEL: Record<string, string> = {
  protein: 'Bílkoviny', carb: 'Sacharidy', fat: 'Tuky',
  vegetable: 'Zelenina', fruit: 'Ovoce', dairy: 'Mléčné', other: 'Ostatní',
};

// ─── types ───────────────────────────────────────────────────
type Mode = 'food' | 'recipe';

interface RawIngredient {
  name: string;
  estimated_amount: string;
  category: string;
  kcal_estimate: number;
}

interface RawRecipeIngredient {
  name: string;
  amount: string;
  grams: number;
  category: string;
  kcal_total: number;
}

interface ScanResult {
  dish_name: string;
  ingredients: RawIngredient[];
  estimated_macros: { kcal: number; carbs_g: number; protein_g: number; fat_g: number };
  confidence: 'high' | 'medium' | 'low';
  cycling_note: string;
}

interface RecipeResult {
  recipe_name: string;
  servings: number;
  ingredients: RawRecipeIngredient[];
  per_serving_macros: { kcal: number; carbs_g: number; protein_g: number; fat_g: number };
  confidence: 'high' | 'medium' | 'low';
  cycling_note: string;
}

interface EditableIngredient extends RawIngredient {
  originalGrams: number;
  currentGrams: number;
}

interface EditableRecipeIngredient extends RawRecipeIngredient {
  originalGrams: number;
  currentGrams: number;
}

interface FoodScannerProps {
  accent:   string;
  userId:   string;
  date:     string;
  mealSlot: string;
  onResult: (entry: Omit<FoodEntry, 'id'>) => void;
  onClose:  () => void;
}

// ─── helpers ─────────────────────────────────────────────────
function parseGrams(amount: string): number {
  const m = amount.match(/(\d+(?:[.,]\d+)?)\s*g/i);
  return m ? parseFloat(m[1].replace(',', '.')) : 100;
}

function compressImage(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1536; // higher for recipe text readability
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else       { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve({ base64: canvas.toDataURL('image/jpeg', 0.88).split(',')[1], mediaType: 'image/jpeg' });
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
}

// ─── component ───────────────────────────────────────────────
export default function FoodScanner({ accent, userId, date, mealSlot, onResult, onClose }: FoodScannerProps) {
  type Step = 'idle' | 'preview' | 'analyzing' | 'results' | 'error';

  const [mode,         setMode]        = useState<Mode>('food');
  const [step,         setStep]        = useState<Step>('idle');
  const [previewUrl,   setPreviewUrl]  = useState('');
  const [imageData,    setImageData]   = useState<{ base64: string; mediaType: string } | null>(null);
  const [scanResult,   setScanResult]  = useState<ScanResult | null>(null);
  const [recipeResult,      setRecipeResult]      = useState<RecipeResult | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<EditableRecipeIngredient[]>([]);
  const [ingredients,       setIngredients]       = useState<EditableIngredient[]>([]);
  const [servings,          setServings]          = useState(1);
  const [editingIdx,        setEditingIdx]        = useState<number | null>(null);
  const [errorMsg,     setErrorMsg]    = useState('');
  const [adding,       setAdding]      = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    try {
      setImageData(await compressImage(file));
      setStep('preview');
    } catch {
      setErrorMsg('Nepodařilo se načíst obrázek.');
      setStep('error');
    }
  }, []);

  const analyze = useCallback(async () => {
    if (!imageData) return;
    setStep('analyzing');
    try {
      const res  = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData.base64, mediaType: imageData.mediaType, mode }),
        signal: AbortSignal.timeout(40_000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Chyba serveru (${res.status})`);

      const result = data.result as (ScanResult | RecipeResult) & { error?: string; message?: string };

      if (result.error) {
        setErrorMsg(result.message || 'Nepodařilo se rozpoznat.');
        setStep('error');
        return;
      }

      if (mode === 'recipe') {
        const r = result as RecipeResult;
        setRecipeResult(r);
        setRecipeIngredients(r.ingredients.map(ing => ({
          ...ing, originalGrams: ing.grams || 100, currentGrams: ing.grams || 100,
        })));
        setServings(1);
      } else {
        const r = result as ScanResult;
        setScanResult(r);
        setIngredients(r.ingredients.map(ing => {
          const g = parseGrams(ing.estimated_amount);
          return { ...ing, originalGrams: g, currentGrams: g };
        }));
      }
      setStep('results');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg.includes('timeout') ? 'Vypršel časový limit. Zkus to znovu.' : msg);
      setStep('error');
    }
  }, [imageData, mode]);

  const updateGrams = (idx: number, grams: number) =>
    setIngredients(prev => prev.map((ing, i) => i === idx ? { ...ing, currentGrams: grams } : ing));

  const removeIngredient = (idx: number) =>
    setIngredients(prev => prev.filter((_, i) => i !== idx));

  const updateRecipeGrams = (idx: number, grams: number) =>
    setRecipeIngredients(prev => prev.map((ing, i) => i === idx ? { ...ing, currentGrams: grams } : ing));

  const updateRecipeName = (idx: number, name: string) =>
    setRecipeIngredients(prev => prev.map((ing, i) => i === idx ? { ...ing, name } : ing));

  const removeRecipeIngredient = (idx: number) => {
    setRecipeIngredients(prev => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  // scaled food macros
  const scaledMacros = (() => {
    if (!scanResult || !ingredients.length) return null;
    const origTotal = ingredients.reduce((s, i) => s + i.originalGrams, 0);
    const currTotal = ingredients.reduce((s, i) => s + i.currentGrams, 0);
    const scale = origTotal > 0 ? currTotal / origTotal : 1;
    const m = scanResult.estimated_macros;
    return {
      kcal: Math.round(m.kcal * scale), carbs: Math.round(m.carbs_g * scale),
      protein: Math.round(m.protein_g * scale), fat: Math.round(m.fat_g * scale),
      grams: Math.round(currTotal),
    };
  })();

  // scaled recipe macros (per N servings, adjusted for edited/removed ingredients)
  const recipeMacros = (() => {
    if (!recipeResult || !recipeIngredients.length) return null;
    // Original total kcal from the scan — never changes
    const origTotalKcal = recipeResult.ingredients.reduce((s, i) => s + (i.kcal_total || 0), 0);
    // Current kcal — only remaining ingredients, scaled by gram changes
    const currTotalKcal = recipeIngredients.reduce((s, i) =>
      s + (i.originalGrams > 0 ? (i.kcal_total * i.currentGrams / i.originalGrams) : 0), 0);
    const scale = origTotalKcal > 0 ? currTotalKcal / origTotalKcal : 1;
    const m = recipeResult.per_serving_macros;
    return {
      kcal:    Math.round(m.kcal      * scale * servings),
      carbs:   Math.round(m.carbs_g   * scale * servings),
      protein: Math.round(m.protein_g * scale * servings),
      fat:     Math.round(m.fat_g     * scale * servings),
    };
  })();

  const handleAddFood = async () => {
    if (!scanResult || !scaledMacros) return;
    setAdding(true);
    const scanId = `ai_scan_${Date.now()}`;
    const ingData = ingredients.map(ing => ({
      name: ing.name,
      grams: ing.currentGrams,
      kcalPer100g: ing.originalGrams > 0 ? Math.round(ing.kcal_estimate * 100 / ing.originalGrams) : 0,
    }));
    if (ingData.length > 0) localStorage.setItem(`cfi_${scanId}`, JSON.stringify(ingData));
    onResult({
      user_id: userId, date, meal_slot: mealSlot,
      food_id: scanId, food_name: scanResult.dish_name,
      grams: scaledMacros.grams, kcal: scaledMacros.kcal,
      carbs: scaledMacros.carbs, protein: scaledMacros.protein,
      fat: scaledMacros.fat, fiber: 0,
      na: 0, k: 0, mg: 0, ca: 0, fe: 0, vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0,
    });
    setAdding(false);
  };

  const handleAddRecipe = async () => {
    if (!recipeResult || !recipeMacros) return;
    setAdding(true);
    const scanId = `ai_recipe_${Date.now()}`;
    const totalGrams = recipeIngredients.reduce((s, i) => s + i.currentGrams, 0) * servings;
    const ingData = recipeIngredients.map(ing => ({
      name: ing.name,
      grams: Math.round(ing.currentGrams * servings),
      kcalPer100g: ing.originalGrams > 0 ? Math.round(ing.kcal_total * 100 / ing.originalGrams) : 0,
    }));
    if (ingData.length > 0) localStorage.setItem(`cfi_${scanId}`, JSON.stringify(ingData));
    onResult({
      user_id: userId, date, meal_slot: mealSlot,
      food_id: scanId,
      food_name: `${recipeResult.recipe_name}${servings > 1 ? ` (${servings} porce)` : ''}`,
      grams: Math.round(totalGrams), kcal: recipeMacros.kcal,
      carbs: recipeMacros.carbs, protein: recipeMacros.protein,
      fat: recipeMacros.fat, fiber: 0,
      na: 0, k: 0, mg: 0, ca: 0, fe: 0, vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0,
    });
    setAdding(false);
  };

  const reset = () => {
    setStep('idle'); setPreviewUrl(''); setImageData(null);
    setScanResult(null); setRecipeResult(null);
    setIngredients([]); setRecipeIngredients([]);
    setServings(1); setErrorMsg(''); setEditingIdx(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confidence = (scanResult?.confidence ?? recipeResult?.confidence) as 'high' | 'medium' | 'low' | undefined;
  const cyclingNote = scanResult?.cycling_note ?? recipeResult?.cycling_note;

  // ─── styles ──────────────────────────────────────────────
  const macroBar = (m: { kcal: number; carbs: number; protein: number; fat: number }) => (
    <div style={{ background: T.bg, borderRadius: 14, padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
      {[{ label: 'kcal', val: m.kcal, color: T.text }, { label: 'Sacharidy', val: `${m.carbs}g`, color: C.blue },
        { label: 'Bílkoviny', val: `${m.protein}g`, color: C.red }, { label: 'Tuky', val: `${m.fat}g`, color: C.orange }]
        .map(x => (
          <div key={x.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: x.color, fontFamily: 'Syne,sans-serif' }}>{x.val}</div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{x.label}</div>
          </div>
        ))}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: T.card, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '92dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: T.text, fontSize: 16 }}>
              AI Scan
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        {/* Mode toggle — only in idle/preview */}
        {(step === 'idle' || step === 'preview') && (
          <div style={{ display: 'flex', gap: 6, padding: '12px 20px', flexShrink: 0 }}>
            {([['food', '🍽️ Jídlo'], ['recipe', '📖 Recept']] as [Mode, string][]).map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); reset(); }} style={{
                flex: 1, padding: '9px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                background: mode === m ? accent : T.border,
                color: mode === m ? '#000' : T.muted,
                transition: 'all 0.15s',
              }}>{label}</button>
            ))}
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 20px 32px' }}>

          {/* ── IDLE ── */}
          {step === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 8 }}>
              <button onClick={() => fileInputRef.current?.click()} style={{
                width: '100%', height: 180, borderRadius: 16, border: `2px dashed ${accent}55`,
                background: `${accent}08`, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 44 }}>{mode === 'recipe' ? '📖' : '📸'}</span>
                <span style={{ fontSize: 14, color: accent, fontWeight: 600 }}>
                  {mode === 'recipe' ? 'Vyfoť recept' : 'Vyfoť jídlo'}
                </span>
                <span style={{ fontSize: 12, color: T.muted }}>
                  {mode === 'recipe' ? 'Recept z knihy, webu nebo papíru' : 'AI rozpozná ingredience a makra'}
                </span>
              </button>

              <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                onChange={handleFileChange} style={{ display: 'none' }} />

              <button onClick={() => { if (fileInputRef.current) { fileInputRef.current.removeAttribute('capture'); fileInputRef.current.click(); } }}
                style={{ background: T.border, border: 'none', borderRadius: 10, color: T.muted, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>
                🖼️ Vybrat z galerie
              </button>
              <p style={{ fontSize: 12, color: T.muted, textAlign: 'center', margin: 0 }}>Powered by Gemini AI · Odhady jsou přibližné</p>
            </div>
          )}

          {/* ── PREVIEW ── */}
          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <img src={previewUrl} alt="preview" style={{ width: '100%', borderRadius: 14, objectFit: 'cover', maxHeight: 260 }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={reset} style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: T.border, border: 'none', color: T.muted, cursor: 'pointer', fontSize: 14 }}>↩ Znovu</button>
                <button onClick={analyze} style={{ flex: 2, padding: '12px 0', borderRadius: 12, background: accent, border: 'none', color: '#000', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                  🔍 Analyzovat
                </button>
              </div>
            </div>
          )}

          {/* ── ANALYZING ── */}
          {step === 'analyzing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '32px 0' }}>
              {previewUrl && <img src={previewUrl} alt="" style={{ width: '100%', borderRadius: 14, maxHeight: 180, objectFit: 'cover', opacity: 0.4 }} />}
              <Spinner color={accent} size={36} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: T.text, fontWeight: 600, marginBottom: 4 }}>
                  {mode === 'recipe' ? 'Čtu recept…' : 'Analyzuji jídlo…'}
                </div>
                <div style={{ color: T.muted, fontSize: 13 }}>Gemini AI rozpoznává ingredience</div>
              </div>
            </div>
          )}

          {/* ── RESULTS: FOOD ── */}
          {step === 'results' && mode === 'food' && scanResult && scaledMacros && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {previewUrl && <img src={previewUrl} alt="food" style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 150 }} />}

              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: 'Syne,sans-serif' }}>{scanResult.dish_name}</div>
                <ConfidenceBadge confidence={confidence} />
              </div>

              {macroBar(scaledMacros)}

              <div>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Ingredience</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ingredients.map((ing, i) => {
                    const scaledKcal = ing.originalGrams > 0 ? Math.round(ing.kcal_estimate * ing.currentGrams / ing.originalGrams) : 0;
                    const cc = CAT_COLOR[ing.category] ?? C.muted;
                    return (
                      <div key={i} style={{ background: T.bg, borderRadius: 12, padding: '12px 14px', border: `1px solid ${T.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{CAT_EMOJI[ing.category] ?? '🍽️'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{ing.name}</div>
                            <span style={{ fontSize: 11, color: cc, background: `${cc}18`, padding: '1px 7px', borderRadius: 20, display: 'inline-block', marginTop: 2 }}>
                              {CAT_LABEL[ing.category] ?? ing.category}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 4 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{ing.currentGrams} g</div>
                            <div style={{ fontSize: 11, color: T.muted }}>{scaledKcal} kcal</div>
                          </div>
                          <button
                            onClick={() => removeIngredient(i)}
                            style={{ background: '#ff6b6b22', border: '1px solid #ff6b6b44', borderRadius: 8, color: '#ff6b6b', width: 28, height: 28, cursor: 'pointer', fontSize: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Odebrat ingredienci"
                          >×</button>
                        </div>
                        <input type="range" min={5} max={Math.max(500, ing.originalGrams * 3)} step={5}
                          value={ing.currentGrams} onChange={e => updateGrams(i, Number(e.target.value))}
                          style={{ width: '100%', accentColor: cc, cursor: 'pointer' }} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {cyclingNote && <CyclingNote note={cyclingNote} accent={accent} />}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <AddBtn loading={adding} onClick={handleAddFood} label={`Přidat do deníku · ${scaledMacros.kcal} kcal`} />
                <button onClick={reset} style={{ padding: '11px 0', borderRadius: 14, border: `1px solid ${T.border}`, background: 'none', color: T.muted, fontSize: 14, cursor: 'pointer' }}>
                  📷 Skenovat znovu
                </button>
              </div>
            </div>
          )}

          {/* ── RESULTS: RECIPE ── */}
          {step === 'results' && mode === 'recipe' && recipeResult && recipeMacros && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {previewUrl && <img src={previewUrl} alt="recipe" style={{ width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 150 }} />}

              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: 'Syne,sans-serif' }}>{recipeResult.recipe_name}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Recept na {recipeResult.servings} porcí</div>
                <ConfidenceBadge confidence={confidence} />
              </div>

              {/* Servings picker */}
              <div style={{ background: T.bg, borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ fontSize: 13, color: T.muted, marginBottom: 10 }}>Kolik porcí chceš přidat?</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setServings(s => Math.max(0.5, s - 0.5))}
                    style={{ width: 36, height: 36, borderRadius: '50%', background: T.border, border: 'none', color: T.text, fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>−</button>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: accent, fontFamily: 'Syne,sans-serif' }}>{servings}</span>
                    <span style={{ fontSize: 13, color: T.muted, marginLeft: 6 }}>
                      {servings === 1 ? 'porce' : servings < 5 ? 'porce' : 'porcí'}
                    </span>
                  </div>
                  <button onClick={() => setServings(s => Math.min(recipeResult.servings, s + 0.5))}
                    style={{ width: 36, height: 36, borderRadius: '50%', background: T.border, border: 'none', color: T.text, fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>+</button>
                </div>
              </div>

              {macroBar(recipeMacros)}

              {/* Ingredient list (editable) */}
              <div>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Ingredience receptu · {recipeIngredients.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recipeIngredients.map((ing, i) => {
                    const cc = CAT_COLOR[ing.category] ?? C.muted;
                    const scaledKcal = ing.originalGrams > 0
                      ? Math.round(ing.kcal_total * ing.currentGrams / ing.originalGrams)
                      : 0;
                    const isEditing = editingIdx === i;
                    return (
                      <div key={i} style={{ background: T.bg, borderRadius: 12, padding: '12px 14px', border: `1px solid ${isEditing ? cc : T.border}`, transition: 'border-color 0.15s' }}>
                        {/* Top row: emoji + name + delete */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{CAT_EMOJI[ing.category] ?? '🍽️'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {isEditing ? (
                              <input
                                autoFocus
                                value={ing.name}
                                onChange={e => updateRecipeName(i, e.target.value)}
                                onBlur={() => setEditingIdx(null)}
                                style={{
                                  width: '100%', background: T.card, border: `1px solid ${cc}`,
                                  borderRadius: 8, padding: '4px 8px', color: T.text,
                                  fontSize: 13, fontWeight: 600, outline: 'none',
                                }}
                              />
                            ) : (
                              <div
                                onClick={() => setEditingIdx(i)}
                                style={{ fontSize: 13, color: T.text, fontWeight: 600, cursor: 'pointer', padding: '4px 0' }}
                                title="Klikni pro úpravu názvu"
                              >
                                {ing.name} ✏️
                              </div>
                            )}
                            <span style={{ fontSize: 11, color: cc, background: `${cc}18`, padding: '1px 7px', borderRadius: 20, display: 'inline-block', marginTop: 2 }}>
                              {CAT_LABEL[ing.category] ?? ing.category}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 4 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{ing.currentGrams} g</div>
                            <div style={{ fontSize: 11, color: T.muted }}>{scaledKcal} kcal</div>
                          </div>
                          <button
                            onClick={() => removeRecipeIngredient(i)}
                            style={{ background: '#ff6b6b22', border: '1px solid #ff6b6b44', borderRadius: 8, color: '#ff6b6b', width: 28, height: 28, cursor: 'pointer', fontSize: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Odebrat ingredienci"
                          >×</button>
                        </div>
                        {/* Gram slider */}
                        <input
                          type="range"
                          min={5} max={Math.max(800, ing.originalGrams * 3)} step={5}
                          value={ing.currentGrams}
                          onChange={e => updateRecipeGrams(i, Number(e.target.value))}
                          style={{ width: '100%', accentColor: cc, cursor: 'pointer' }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {cyclingNote && <CyclingNote note={cyclingNote} accent={accent} />}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <AddBtn loading={adding} onClick={handleAddRecipe} label={`Přidat ${servings} ${servings === 1 ? 'porci' : 'porce'} · ${recipeMacros.kcal} kcal`} />
                <button onClick={reset} style={{ padding: '11px 0', borderRadius: 14, border: `1px solid ${T.border}`, background: 'none', color: T.muted, fontSize: 14, cursor: 'pointer' }}>
                  📷 Skenovat znovu
                </button>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {step === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
              <span style={{ fontSize: 52 }}>⚠️</span>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: T.text, fontWeight: 600, marginBottom: 6 }}>Nepodařilo se analyzovat</div>
                <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.5 }}>{errorMsg}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: T.border, border: 'none', color: T.muted, cursor: 'pointer', fontSize: 14 }}>Zavřít</button>
                <button onClick={reset} style={{ flex: 2, padding: '12px 0', borderRadius: 12, background: accent, border: 'none', color: '#000', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                  🔄 Zkusit znovu
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── small helpers ────────────────────────────────────────────
function ConfidenceBadge({ confidence }: { confidence?: 'high' | 'medium' | 'low' }) {
  if (!confidence) return null;
  if (confidence === 'high') return (
    <span style={{ display: 'inline-block', marginTop: 6, fontSize: 11, padding: '3px 8px', borderRadius: 20, background: '#00e67622', color: '#00e676', border: '1px solid #00e67644' }}>
      ✓ Vysoká přesnost
    </span>
  );
  const isLow = confidence === 'low';
  return (
    <span style={{ display: 'inline-block', marginTop: 6, fontSize: 11, padding: '3px 8px', borderRadius: 20, background: isLow ? '#ff6b6b22' : '#ffab4022', color: isLow ? '#ff6b6b' : '#ffab40', border: `1px solid ${isLow ? '#ff6b6b44' : '#ffab4044'}` }}>
      ⚠ {isLow ? 'Nízká přesnost – zkontroluj' : 'Střední přesnost'}
    </span>
  );
}

function CyclingNote({ note, accent }: { note: string; accent: string }) {
  return (
    <div style={{ background: `${accent}12`, borderRadius: 12, padding: '12px 14px', border: `1px solid ${accent}30`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>🚴</span>
      <span style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>{note}</span>
    </div>
  );
}

function AddBtn({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      padding: '14px 0', borderRadius: 14, border: 'none',
      background: loading ? '#00e67666' : '#00e676',
      color: '#000', fontWeight: 700, fontSize: 15, cursor: loading ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      {loading && <Spinner color="#000" size={18} />}
      {loading ? 'Přidávám…' : label}
    </button>
  );
}
