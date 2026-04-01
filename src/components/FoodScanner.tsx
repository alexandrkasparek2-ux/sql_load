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
  protein:   C.red,
  carb:      C.blue,
  fat:       C.orange,
  vegetable: C.green,
  fruit:     '#ff9800',
  dairy:     C.purple,
  other:     C.muted,
};

const CAT_EMOJI: Record<string, string> = {
  protein:   '🥩',
  carb:      '🍚',
  fat:       '🫒',
  vegetable: '🥦',
  fruit:     '🍌',
  dairy:     '🥛',
  other:     '🍽️',
};

const CAT_LABEL: Record<string, string> = {
  protein:   'Bílkoviny',
  carb:      'Sacharidy',
  fat:       'Tuky',
  vegetable: 'Zelenina',
  fruit:     'Ovoce',
  dairy:     'Mléčné',
  other:     'Ostatní',
};

// ─── types ───────────────────────────────────────────────────
interface RawIngredient {
  name: string;
  estimated_amount: string;
  category: string;
  kcal_estimate: number;
}

interface ScanResult {
  dish_name: string;
  ingredients: RawIngredient[];
  estimated_macros: { kcal: number; carbs_g: number; protein_g: number; fat_g: number };
  confidence: 'high' | 'medium' | 'low';
  cycling_note: string;
}

interface EditableIngredient extends RawIngredient {
  originalGrams: number;
  currentGrams: number;
}

interface FoodScannerProps {
  accent:    string;
  userId:    string;
  date:      string;
  mealSlot:  string;
  onResult:  (entry: Omit<FoodEntry, 'id'>) => void;
  onClose:   () => void;
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
      const MAX = 1024;
      let w = img.width;
      let h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else       { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
}

// ─── component ───────────────────────────────────────────────
export default function FoodScanner({ accent, userId, date, mealSlot, onResult, onClose }: FoodScannerProps) {
  type Step = 'idle' | 'preview' | 'analyzing' | 'results' | 'error';

  const [step,        setStep]        = useState<Step>('idle');
  const [previewUrl,  setPreviewUrl]  = useState<string>('');
  const [imageData,   setImageData]   = useState<{ base64: string; mediaType: string } | null>(null);
  const [scanResult,  setScanResult]  = useState<ScanResult | null>(null);
  const [ingredients, setIngredients] = useState<EditableIngredient[]>([]);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [adding,      setAdding]      = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── image selection ────────────────────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      const compressed = await compressImage(file);
      setImageData(compressed);
      setStep('preview');
    } catch {
      setErrorMsg('Nepodařilo se načíst obrázek.');
      setStep('error');
    }
  }, []);

  // ── analyze ────────────────────────────────────────────────
  const analyze = useCallback(async () => {
    if (!imageData) return;
    setStep('analyzing');

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData.base64, mediaType: imageData.mediaType }),
        signal: AbortSignal.timeout(30_000),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Chyba serveru (${res.status})`);
      }

      const result: ScanResult & { error?: string; message?: string } = data.result;

      if (result.error === 'not_food') {
        setErrorMsg(result.message || 'Na fotce nebylo rozpoznáno jídlo.');
        setStep('error');
        return;
      }
      if (result.error === 'low_quality') {
        setErrorMsg(result.message || 'Fotka je příliš tmavá nebo rozmazaná.');
        setStep('error');
        return;
      }

      const editable: EditableIngredient[] = result.ingredients.map(ing => {
        const g = parseGrams(ing.estimated_amount);
        return { ...ing, originalGrams: g, currentGrams: g };
      });

      setScanResult(result);
      setIngredients(editable);
      setStep('results');

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg.includes('timeout') ? 'Vypršel časový limit. Zkus to znovu.' : msg);
      setStep('error');
    }
  }, [imageData]);

  // ── gram change ────────────────────────────────────────────
  const updateGrams = (idx: number, grams: number) => {
    setIngredients(prev => prev.map((ing, i) => i === idx ? { ...ing, currentGrams: grams } : ing));
  };

  // ── scaled macros ──────────────────────────────────────────
  const scaledMacros = (() => {
    if (!scanResult || !ingredients.length) return null;
    const origTotal = ingredients.reduce((s, i) => s + i.originalGrams, 0);
    const currTotal = ingredients.reduce((s, i) => s + i.currentGrams, 0);
    const scale = origTotal > 0 ? currTotal / origTotal : 1;
    const m = scanResult.estimated_macros;
    return {
      kcal:    Math.round(m.kcal    * scale),
      carbs:   Math.round(m.carbs_g   * scale),
      protein: Math.round(m.protein_g * scale),
      fat:     Math.round(m.fat_g     * scale),
      grams:   Math.round(currTotal),
    };
  })();

  // ── add to diary ───────────────────────────────────────────
  const handleAdd = async () => {
    if (!scanResult || !scaledMacros) return;
    setAdding(true);
    const entry: Omit<FoodEntry, 'id'> = {
      user_id:   userId,
      date,
      meal_slot: mealSlot,
      food_id:   `ai_scan_${Date.now()}`,
      food_name: scanResult.dish_name,
      grams:     scaledMacros.grams,
      kcal:      scaledMacros.kcal,
      carbs:     scaledMacros.carbs,
      protein:   scaledMacros.protein,
      fat:       scaledMacros.fat,
      fiber:     0,
      na: 0, k: 0, mg: 0, ca: 0, fe: 0,
      vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0,
    };
    onResult(entry);
    setAdding(false);
  };

  // ── reset ──────────────────────────────────────────────────
  const reset = () => {
    setStep('idle');
    setPreviewUrl('');
    setImageData(null);
    setScanResult(null);
    setIngredients([]);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─────────────────────────────────────────────────────────
  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  };

  const sheet: React.CSSProperties = {
    background: T.card,
    borderRadius: '20px 20px 0 0',
    width: '100%',
    maxWidth: 520,
    maxHeight: '92dvh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const header: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px 12px',
    borderBottom: `1px solid ${T.border}`,
    flexShrink: 0,
  };

  const body: React.CSSProperties = {
    overflowY: 'auto',
    flex: 1,
    padding: '16px 20px 32px',
  };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={sheet}>

        {/* Header */}
        <div style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: T.text, fontSize: 16 }}>
              Scan jídla
            </span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: T.muted,
            fontSize: 22, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
          }}>×</button>
        </div>

        <div style={body}>

          {/* ── IDLE ── */}
          {step === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 12 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', height: 200, borderRadius: 16,
                  border: `2px dashed ${accent}55`,
                  background: `${accent}08`,
                  color: T.muted, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 10, transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 48 }}>📸</span>
                <span style={{ fontSize: 14, color: accent, fontWeight: 600 }}>Vyfoť nebo vyber jídlo</span>
                <span style={{ fontSize: 12, color: T.muted }}>AI rozpozná ingredience a makra</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <button
                onClick={() => { if (fileInputRef.current) { fileInputRef.current.removeAttribute('capture'); fileInputRef.current.click(); } }}
                style={{
                  background: T.border, border: 'none', borderRadius: 10,
                  color: T.muted, padding: '10px 24px', cursor: 'pointer', fontSize: 13,
                }}
              >
                🖼️ Vybrat z galerie
              </button>

              <p style={{ fontSize: 12, color: T.muted, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                Powered by Claude AI · Odhady jsou přibližné
              </p>
            </div>
          )}

          {/* ── PREVIEW ── */}
          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <img
                src={previewUrl}
                alt="preview"
                style={{ width: '100%', borderRadius: 14, objectFit: 'cover', maxHeight: 280 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={reset} style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  background: T.border, border: 'none', color: T.muted, cursor: 'pointer', fontSize: 14,
                }}>
                  ↩ Znovu
                </button>
                <button onClick={analyze} style={{
                  flex: 2, padding: '12px 0', borderRadius: 12,
                  background: accent, border: 'none', color: '#000', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700,
                }}>
                  🔍 Analyzovat
                </button>
              </div>
            </div>
          )}

          {/* ── ANALYZING ── */}
          {step === 'analyzing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '40px 0' }}>
              {previewUrl && (
                <img src={previewUrl} alt="analyzing" style={{
                  width: '100%', borderRadius: 14, objectFit: 'cover', maxHeight: 200, opacity: 0.5,
                }} />
              )}
              <Spinner color={accent} size={36} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: T.text, fontWeight: 600, marginBottom: 4 }}>Analyzuji jídlo…</div>
                <div style={{ color: T.muted, fontSize: 13 }}>Claude AI rozpoznává ingredience</div>
              </div>
            </div>
          )}

          {/* ── RESULTS ── */}
          {step === 'results' && scanResult && scaledMacros && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Preview thumb */}
              {previewUrl && (
                <img src={previewUrl} alt="food" style={{
                  width: '100%', borderRadius: 12, objectFit: 'cover', maxHeight: 160,
                }} />
              )}

              {/* Dish name */}
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: 'Syne, sans-serif' }}>
                  {scanResult.dish_name}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {/* Confidence badge */}
                  {scanResult.confidence !== 'high' && (
                    <span style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 20,
                      background: scanResult.confidence === 'medium' ? '#ffab4022' : '#ff6b6b22',
                      color:      scanResult.confidence === 'medium' ? C.orange : C.red,
                      border:     `1px solid ${scanResult.confidence === 'medium' ? C.orange : C.red}44`,
                    }}>
                      {scanResult.confidence === 'medium' ? '⚠ Střední přesnost' : '⚠ Nízká přesnost – zkontroluj'}
                    </span>
                  )}
                  {scanResult.confidence === 'high' && (
                    <span style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 20,
                      background: '#00e67622', color: C.green, border: `1px solid ${C.green}44`,
                    }}>
                      ✓ Vysoká přesnost
                    </span>
                  )}
                </div>
              </div>

              {/* Macro summary */}
              <div style={{
                background: T.bg, borderRadius: 14, padding: '14px 16px',
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
              }}>
                {[
                  { label: 'kcal',  val: scaledMacros.kcal,    color: '#e2e8f0' },
                  { label: 'Sacharidy', val: `${scaledMacros.carbs}g`,   color: C.blue },
                  { label: 'Bílkoviny', val: `${scaledMacros.protein}g`, color: C.red },
                  { label: 'Tuky',      val: `${scaledMacros.fat}g`,     color: C.orange },
                ].map(m => (
                  <div key={m.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: m.color, fontFamily: 'Syne, sans-serif' }}>
                      {m.val}
                    </div>
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Ingredients */}
              <div>
                <div style={{ fontSize: 13, color: T.muted, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Ingredience
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ingredients.map((ing, i) => {
                    const scaledKcal = ing.originalGrams > 0
                      ? Math.round(ing.kcal_estimate * ing.currentGrams / ing.originalGrams)
                      : 0;
                    const catColor = CAT_COLOR[ing.category] ?? C.muted;
                    return (
                      <div key={i} style={{
                        background: T.bg, borderRadius: 12, padding: '12px 14px',
                        border: `1px solid ${T.border}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{CAT_EMOJI[ing.category] ?? '🍽️'}</span>
                            <div>
                              <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{ing.name}</div>
                              <span style={{
                                fontSize: 11, color: catColor,
                                background: `${catColor}18`, padding: '1px 7px',
                                borderRadius: 20, display: 'inline-block', marginTop: 2,
                              }}>
                                {CAT_LABEL[ing.category] ?? ing.category}
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{ing.currentGrams} g</div>
                            <div style={{ fontSize: 11, color: T.muted }}>{scaledKcal} kcal</div>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={5} max={Math.max(500, ing.originalGrams * 3)} step={5}
                          value={ing.currentGrams}
                          onChange={e => updateGrams(i, Number(e.target.value))}
                          style={{ width: '100%', accentColor: catColor, cursor: 'pointer' }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cycling note */}
              {scanResult.cycling_note && (
                <div style={{
                  background: `${accent}12`, borderRadius: 12, padding: '12px 14px',
                  border: `1px solid ${accent}30`, display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>🚴</span>
                  <span style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{scanResult.cycling_note}</span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  style={{
                    padding: '14px 0', borderRadius: 14, border: 'none',
                    background: adding ? `${C.green}66` : C.green,
                    color: '#000', fontWeight: 700, fontSize: 15, cursor: adding ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {adding ? <Spinner color="#000" size={18} /> : null}
                  {adding ? 'Přidávám…' : `Přidat do deníku · ${scaledMacros.kcal} kcal`}
                </button>
                <button
                  onClick={reset}
                  style={{
                    padding: '11px 0', borderRadius: 14, border: `1px solid ${T.border}`,
                    background: 'none', color: T.muted, fontSize: 14, cursor: 'pointer',
                  }}
                >
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
                <button onClick={onClose} style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  background: T.border, border: 'none', color: T.muted, cursor: 'pointer', fontSize: 14,
                }}>
                  Zavřít
                </button>
                <button onClick={reset} style={{
                  flex: 2, padding: '12px 0', borderRadius: 12,
                  background: accent, border: 'none', color: '#000',
                  cursor: 'pointer', fontSize: 14, fontWeight: 700,
                }}>
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
