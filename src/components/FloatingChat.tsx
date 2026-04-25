import { useRef, useEffect, useContext, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../App';
import { T, BRAND } from './UI';
import { useChatSession } from '../hooks/useChatSession';
import { showToast } from './Toast';
import { FOODS, type Food } from '../constants/foods';
import type { FoodEntry } from '../hooks/useFoodEntries';

const SUGGESTIONS = [
  'Co mám dát k večeři?',
  'Mám dost bílkovin na dnes?',
  'Co jíst před tréninkem?',
  'Jak doplnit sacharidy?',
];

function normStr(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function matchFood(query: string): Food | null {
  const q = normStr(query);
  return (
    FOODS.find(f => normStr(f.name).includes(q)) ??
    FOODS.find(f => q.split(/\s+/).some(w => w.length > 3 && normStr(f.name).includes(w))) ??
    null
  );
}

function buildFoodEntry(food: Food, grams: number, userId: string, date: string): Omit<FoodEntry, 'id'> {
  const f = grams / 100;
  return {
    user_id: userId, date, meal_slot: 'odp_svacina',
    food_id: food.id, food_name: food.name, grams,
    kcal:    parseFloat((food.kcal        * f).toFixed(1)),
    carbs:   parseFloat((food.carbs       * f).toFixed(1)),
    protein: parseFloat((food.protein     * f).toFixed(1)),
    fat:     parseFloat((food.fat         * f).toFixed(1)),
    fiber:   parseFloat(((food.fiber ?? 0) * f).toFixed(1)),
    na:      parseFloat((food.micros.na    * f).toFixed(1)),
    k:       parseFloat((food.micros.k     * f).toFixed(1)),
    mg:      parseFloat((food.micros.mg    * f).toFixed(1)),
    ca:      parseFloat((food.micros.ca    * f).toFixed(1)),
    fe:      parseFloat((food.micros.fe    * f).toFixed(2)),
    vit_c:   parseFloat((food.micros.vit_c * f).toFixed(1)),
    vit_d:   parseFloat((food.micros.vit_d * f).toFixed(2)),
    b12:     parseFloat((food.micros.b12   * f).toFixed(2)),
    omega3:  parseFloat((food.micros.omega3 * f).toFixed(1)),
    zn:      parseFloat((food.micros.zn    * f).toFixed(2)),
  };
}

function renderMarkdown(text: string | undefined, accent: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const isBullet = /^[-•*]\s/.test(line);
    const parts = line.replace(/^[-•*]\s/, '').split(/\*\*(.*?)\*\*/g);
    const nodes = parts.map((part, j) =>
      j % 2 === 1
        ? <strong key={j} style={{ color: accent, fontWeight: 700 }}>{part}</strong>
        : <span key={j}>{part}</span>
    );
    return (
      <div key={i} style={{ display: 'flex', gap: isBullet ? 5 : 0, marginBottom: isBullet ? 2 : 0 }}>
        {isBullet && <span style={{ color: accent, flexShrink: 0 }}>•</span>}
        <span>{nodes}</span>
      </div>
    );
  });
}

export default function FloatingChat() {
  const location = useLocation();
  const ctx = useContext(AppContext);
  const { accent, addEntry, removeEntry, updateEntry, setGoalOverride, userId, today } = ctx;
  const { messages, input, setInput, loading, error, send, clearHistory } = useChatSession(ctx);
  const [open,     setOpen]     = useState(false);
  const [actioned, setActioned] = useState<Set<string>>(new Set());

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const hidden = location.pathname === '/chat';

  useEffect(() => {
    if (open && !hidden) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' });
        inputRef.current?.focus();
      }, 50);
    }
  }, [open, hidden]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleLog = useCallback(async (msgId: string, query: string, grams: number) => {
    const food = matchFood(query);
    if (!food) { showToast('Potravina nenalezena v databázi', 'error'); return; }
    await addEntry(buildFoodEntry(food, grams, userId, today));
    setActioned(prev => new Set([...prev, msgId]));
    showToast(`${food.name} přidáno`);
  }, [addEntry, userId, today]);

  const handleGoalsAction = useCallback((msgId: string, g: import('../hooks/useChatSession').GoalsAction) => {
    setGoalOverride(g);
    setActioned(prev => new Set([...prev, msgId]));
  }, [setGoalOverride]);

  const handleDiaryAction = useCallback(async (msgId: string, type: 'delete' | 'edit', entryId: string, foodName: string, grams?: number) => {
    if (type === 'delete') {
      await removeEntry(entryId);
      showToast(`${foodName} smazáno`);
    } else if (type === 'edit' && grams) {
      await updateEntry(entryId, grams);
      showToast(`${foodName} upraveno na ${grams}g`);
    }
    setActioned(prev => new Set([...prev, msgId]));
  }, [removeEntry, updateEntry]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  if (hidden) return null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 250,
          }}
        />
      )}

      {/* Slide-up panel */}
      <div style={{
        position:      'fixed',
        bottom:        0,
        left:          '50%',
        transform:     open
          ? 'translateX(-50%) translateY(0)'
          : 'translateX(-50%) translateY(110%)',
        width:         '100%',
        maxWidth:      500,
        height:        '82dvh',
        background:    T.bg,
        border:        `1px solid ${T.border}`,
        borderRadius:  '20px 20px 0 0',
        zIndex:        300,
        display:       'flex',
        flexDirection: 'column',
        transition:    'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
        overflow:      'hidden',
      }}>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#2a2a2a' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px 12px', borderBottom: `1px solid ${T.border}`, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, flexShrink: 0,
              background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.orange})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>⚡</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>AI Poradce</div>
              <div style={{ fontSize: 11, color: T.muted }}>
                Claude · {messages.length} {messages.length === 1 ? 'zpráva' : messages.length < 5 ? 'zprávy' : 'zpráv'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: T.muted, fontSize: 12, padding: '4px 8px',
                }}
              >
                Smazat
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: T.card, border: `1px solid ${T.border}`,
                cursor: 'pointer', color: T.muted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 4px' }}>

          {messages.length === 0 && (
            <div style={{ paddingTop: 16 }}>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 12, textAlign: 'center' }}>
                Zeptej se na výživu nebo trénink
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      padding: '10px 14px', borderRadius: 12, fontSize: 13,
                      cursor: 'pointer', textAlign: 'left',
                      background: accent + '10', border: `1px solid ${accent}28`, color: accent,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(m => (
            <div key={m.id} style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 10,
              alignItems: 'flex-start',
            }}>
              {m.role === 'model' && (
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.orange})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, marginRight: 7, marginTop: 1,
                }}>⚡</div>
              )}
              <div style={{ maxWidth: '80%', minWidth: 0 }}>
                <div style={{
                  padding:      '9px 12px',
                  borderRadius: m.role === 'user'
                    ? '14px 14px 4px 14px'
                    : '4px 14px 14px 14px',
                  background:   m.role === 'user'
                    ? `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.orange})`
                    : T.card,
                  border:       m.role === 'user' ? 'none' : `1px solid ${T.border}`,
                  color:        m.role === 'user' ? '#000' : T.text,
                  fontSize:     13,
                  lineHeight:   1.6,
                  wordBreak:    'break-word',
                }}>
                  {m.role === 'model'
                    ? renderMarkdown(m.content, accent)
                    : m.content
                  }
                </div>

                {/* Food action */}
                {m.foodAction && !actioned.has(m.id) && (
                  <button
                    onClick={() => handleLog(m.id, m.foodAction!.query, m.foodAction!.grams)}
                    style={{
                      marginTop: 5, padding: '6px 12px', borderRadius: 8, width: '100%',
                      background: BRAND.green + '15', border: `1px solid ${BRAND.green}40`,
                      color: BRAND.green, fontSize: 12, cursor: 'pointer', fontWeight: 600,
                      textAlign: 'left',
                    }}
                  >
                    + Přidat {m.foodAction.grams}g · {m.foodAction.query}
                  </button>
                )}

                {/* Diary delete/edit action */}
                {m.diaryAction && !actioned.has(m.id) && (
                  <button
                    onClick={() => handleDiaryAction(
                      m.id,
                      m.diaryAction!.type,
                      m.diaryAction!.entryId,
                      m.diaryAction!.foodName,
                      m.diaryAction!.grams,
                    )}
                    style={{
                      marginTop: 5, padding: '6px 12px', borderRadius: 8, width: '100%',
                      background: (m.diaryAction.type === 'delete' ? BRAND.red : BRAND.blue) + '15',
                      border: `1px solid ${(m.diaryAction.type === 'delete' ? BRAND.red : BRAND.blue)}40`,
                      color: m.diaryAction.type === 'delete' ? BRAND.red : BRAND.blue,
                      fontSize: 12, cursor: 'pointer', fontWeight: 600, textAlign: 'left',
                    }}
                  >
                    {m.diaryAction.type === 'delete'
                      ? `🗑 Smazat ${m.diaryAction.foodName}`
                      : `✏️ Upravit ${m.diaryAction.foodName} na ${m.diaryAction.grams}g`
                    }
                  </button>
                )}

                {/* Goals action */}
                {m.goalsAction && !actioned.has(m.id) && (
                  <button
                    onClick={() => handleGoalsAction(m.id, m.goalsAction!)}
                    style={{
                      marginTop: 5, padding: '6px 12px', borderRadius: 8, width: '100%',
                      background: BRAND.gold + '15', border: `1px solid ${BRAND.gold}40`,
                      color: BRAND.gold, fontSize: 12, cursor: 'pointer', fontWeight: 600,
                      textAlign: 'left',
                    }}
                  >
                    🎯{' '}
                    {[
                      m.goalsAction.kcal    && `${m.goalsAction.kcal} kcal`,
                      m.goalsAction.carbs   && `S: ${m.goalsAction.carbs}g`,
                      m.goalsAction.protein && `B: ${m.goalsAction.protein}g`,
                      m.goalsAction.fat     && `T: ${m.goalsAction.fat}g`,
                    ].filter(Boolean).join(' · ')}
                  </button>
                )}

                {/* Meal plan action */}
                {m.mealPlanAction && !actioned.has(m.id) && (
                  <button
                    onClick={async () => {
                      for (const meal of m.mealPlanAction!) {
                        await addEntry({
                          user_id: userId, date: today,
                          meal_slot: meal.slot,
                          food_id: `chat_plan_${Date.now()}_${meal.slot}`,
                          food_name: meal.name, grams: meal.grams,
                          kcal: meal.kcal, carbs: meal.carbs, protein: meal.protein, fat: meal.fat,
                          fiber: 0, na: 0, k: 0, mg: 0, ca: 0, fe: 0, vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0,
                        });
                      }
                      setActioned(prev => new Set([...prev, m.id]));
                      showToast(`${m.mealPlanAction!.length} jídel přidáno`);
                    }}
                    style={{
                      marginTop: 5, padding: '6px 12px', borderRadius: 8, width: '100%',
                      background: BRAND.green + '15', border: `1px solid ${BRAND.green}40`,
                      color: BRAND.green, fontSize: 12, cursor: 'pointer', fontWeight: 600,
                      textAlign: 'left',
                    }}
                  >
                    📋 Zapsat {m.mealPlanAction.length} jídel · {m.mealPlanAction.reduce((s, x) => s + x.kcal, 0)} kcal
                  </button>
                )}

                {/* Recipe action */}
                {m.recipeAction && !actioned.has(m.id) && (
                  <button
                    onClick={async () => {
                      const r = m.recipeAction!;
                      const grams = r.ingredients.reduce((s, i) => s + i.grams, 0) || 300;
                      await addEntry({
                        user_id: userId, date: today, meal_slot: 'obed',
                        food_id: `chat_recipe_${Date.now()}`,
                        food_name: r.name, grams,
                        kcal: r.macros.kcal, carbs: r.macros.carbs,
                        protein: r.macros.protein, fat: r.macros.fat,
                        fiber: 0, na: 0, k: 0, mg: 0, ca: 0, fe: 0, vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0,
                      });
                      setActioned(prev => new Set([...prev, m.id]));
                      showToast(`${r.name} přidáno`);
                    }}
                    style={{
                      marginTop: 5, padding: '6px 12px', borderRadius: 8, width: '100%',
                      background: BRAND.orange + '15', border: `1px solid ${BRAND.orange}40`,
                      color: BRAND.orange, fontSize: 12, cursor: 'pointer', fontWeight: 600,
                      textAlign: 'left',
                    }}
                  >
                    👨‍🍳 {m.recipeAction.name} · {m.recipeAction.macros.kcal} kcal
                  </button>
                )}

                {/* Done */}
                {(m.foodAction || m.diaryAction || m.goalsAction || m.mealPlanAction || m.recipeAction) && actioned.has(m.id) && (
                  <div style={{ marginTop: 5, fontSize: 11, color: BRAND.green, fontWeight: 600, paddingLeft: 2 }}>
                    ✓ Hotovo
                  </div>
                )}

                <div style={{ fontSize: 10, color: T.muted, marginTop: 3, paddingLeft: 2 }}>
                  {new Date(m.ts).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Loading dots */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 10 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.orange})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              }}>⚡</div>
              <div style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: '4px 14px 14px 14px', padding: '10px 14px',
              }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: 3, background: accent,
                      animation: `chatBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: BRAND.red + '15', border: `1px solid ${BRAND.red}33`,
              borderRadius: 10, padding: '8px 12px', marginBottom: 8,
              fontSize: 12, color: BRAND.red,
            }}>
              ⚠️ {error}
            </div>
          )}

          <div ref={bottomRef} style={{ height: 8 }} />
        </div>

        {/* Input */}
        <div style={{
          padding: '10px 12px 20px',
          borderTop: `1px solid ${T.border}`,
          background: T.bg,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Napiš dotaz… (Enter = odeslat)"
              rows={1}
              style={{
                flex: 1, background: T.card,
                border: `1px solid ${input.trim() ? accent + '50' : T.border}`,
                borderRadius: 14, padding: '9px 12px', color: T.text,
                fontSize: 13, outline: 'none', resize: 'none',
                lineHeight: 1.5, maxHeight: 100, overflowY: 'auto',
                transition: 'border-color 0.2s',
              }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: input.trim() && !loading
                  ? `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.orange})`
                  : T.border,
                border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: input.trim() && !loading ? '#000' : T.muted,
                fontSize: 17, fontWeight: 700,
                transition: 'background 0.2s',
              }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>

      {/* Floating bubble button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position:       'fixed',
          bottom:         90,
          right:          16,
          width:          52,
          height:         52,
          borderRadius:   '50%',
          background:     open
            ? T.card
            : `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.orange})`,
          border:         open ? `1px solid ${T.border}` : 'none',
          cursor:         'pointer',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          zIndex:         400,
          boxShadow:      open ? 'none' : `0 4px 20px ${BRAND.gold}55`,
          transition:     'all 0.2s',
          color:          open ? T.muted : '#000',
          fontSize:       22,
        }}
        aria-label={open ? 'Zavřít chat' : 'Otevřít AI poradce'}
      >
        {open ? '×' : '⚡'}
      </button>

      <style>{`
        @keyframes chatBounce {
          0%, 80%, 100% { transform: scale(0.3); opacity: 0.3; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </>
  );
}
