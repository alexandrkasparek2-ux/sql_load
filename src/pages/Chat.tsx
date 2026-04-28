import { useRef, useEffect, useContext, useState, useCallback } from 'react';
import { AppContext } from '../App';
import { T, BRAND } from '../components/UI';
import { useChatSession } from '../hooks/useChatSession';
import type { MealPlanItem, RecipeSuggestionAction } from '../hooks/useChatSession';
import { useTrainingPlan } from '../hooks/useTrainingPlan';
import { showToast } from '../components/Toast';
import { FOODS, type Food } from '../constants/foods';
import type { FoodEntry } from '../hooks/useFoodEntries';
import { MetricBox } from '../components/performance-ui';

const SLOT_LABELS: Record<string, string> = {
  snidane: 'Snídaně', dop_svacina: 'Dop. svačina', obed: 'Oběd',
  odp_svacina: 'Odp. svačina', pred_tren: 'Před tréninkem',
  behem_tren: 'Během tréninku', po_tren: 'Po tréninku', vecere: 'Večeře',
};

const SUGGESTIONS = [
  { text: 'Co mám dát k večeři?',           icon: '🍽️', color: BRAND.orange },
  { text: 'Mám dost bílkovin?',              icon: '💪', color: BRAND.purple },
  { text: 'Co jíst před tréninkem?',         icon: '⚡', color: BRAND.gold   },
  { text: 'Co jíst po tréninku?',            icon: '🔄', color: BRAND.blue   },
  { text: 'Vygeneruj mi jídelníček na dnes', icon: '📋', color: BRAND.green  },
  { text: 'Mám doma kuřecí prsa a rýži, co uvařit?', icon: '👨‍🍳', color: BRAND.red },
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
    kcal:    parseFloat((food.kcal         * f).toFixed(1)),
    carbs:   parseFloat((food.carbs        * f).toFixed(1)),
    protein: parseFloat((food.protein      * f).toFixed(1)),
    fat:     parseFloat((food.fat          * f).toFixed(1)),
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

function renderMarkdown(text: string | undefined, color: string) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    const isBullet = /^[-•*]\s/.test(line);
    const parts = line.replace(/^[-•*]\s/, '').split(/\*\*(.*?)\*\*/g);
    const nodes = parts.map((part, j) =>
      j % 2 === 1
        ? <strong key={j} style={{ color, fontWeight: 700 }}>{part}</strong>
        : <span key={j}>{part}</span>
    );
    return (
      <div key={i} style={{ display: 'flex', gap: isBullet ? 6 : 0, marginBottom: isBullet ? 2 : 0 }}>
        {isBullet && <span style={{ color, flexShrink: 0 }}>•</span>}
        <span>{nodes}</span>
      </div>
    );
  });
}

export default function Chat() {
  const ctx = useContext(AppContext);
  const { accent, addEntry, removeEntry, updateEntry, setGoalOverride, userId, today } = ctx;
  const { todayWorkout, upcoming } = useTrainingPlan();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const tomorrowWorkout = upcoming.find(w => w.date === tomorrowStr) ?? null;
  const { messages, input, setInput, loading, error, send, clearHistory } = useChatSession(ctx, {
    today: todayWorkout,
    tomorrow: tomorrowWorkout,
  });
  const [actioned, setActioned] = useState<Set<string>>(new Set());
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1440;
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(min-width: 1440px)');
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

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

  const handleMealPlan = useCallback(async (msgId: string, meals: MealPlanItem[]) => {
    for (const meal of meals) {
      await addEntry({
        user_id: userId, date: today,
        meal_slot: meal.slot in SLOT_LABELS ? meal.slot : 'odp_svacina',
        food_id: `chat_plan_${Date.now()}_${meal.slot}`,
        food_name: meal.name, grams: meal.grams,
        kcal: meal.kcal, carbs: meal.carbs, protein: meal.protein, fat: meal.fat,
        fiber: 0, na: 0, k: 0, mg: 0, ca: 0, fe: 0, vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0,
      });
    }
    setActioned(prev => new Set([...prev, msgId]));
    showToast(`${meals.length} jídel přidáno do deníku`);
  }, [addEntry, userId, today]);

  const handleRecipe = useCallback(async (msgId: string, recipe: RecipeSuggestionAction) => {
    const totalGrams = recipe.ingredients.reduce((s, i) => s + i.grams, 0) || 300;
    await addEntry({
      user_id: userId, date: today,
      meal_slot: 'obed',
      food_id: `chat_recipe_${Date.now()}`,
      food_name: recipe.name, grams: totalGrams,
      kcal: recipe.macros.kcal, carbs: recipe.macros.carbs,
      protein: recipe.macros.protein, fat: recipe.macros.fat,
      fiber: 0, na: 0, k: 0, mg: 0, ca: 0, fe: 0, vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0,
    });
    setActioned(prev => new Set([...prev, msgId]));
    showToast(`${recipe.name} přidáno do deníku`);
  }, [addEntry, userId, today]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const isEmpty = messages.length === 0;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isDesktop ? '320px minmax(0, 1fr)' : '1fr',
      height: '100%',
      minHeight: isDesktop ? 'calc(100dvh - 56px)' : 'calc(100dvh - 120px)',
    }}>
      {isDesktop && (
        <aside style={{
          borderRight: `1px solid ${T.border}`,
          padding: '24px 18px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>
            AI Poradce
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.text, letterSpacing: '-0.04em', marginBottom: 8 }}>
            Zeptej se na jídlo, trénink a regeneraci
          </div>
          <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, marginBottom: 18 }}>
            Na notebooku má chat vlastní širokou plochu a rychlé návrhy zůstávají bokem místo mačkání hlavní konverzace.
          </div>
          <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
            <MetricBox label="Dnešní cíl" value={Math.round(goals.kcal)} unit="kcal" variant="warning" />
            <MetricBox label="Snědeno" value={Math.round(totals.kcal)} unit="kcal" variant="default" />
            <MetricBox label="Trénink" value={trainingDay?.training_type ?? 'rest'} variant="analytics" />
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s.text}
                onClick={() => send(s.text)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 14,
                  background: s.color + '0d', border: `1px solid ${s.color}28`,
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: s.color + '18', border: `1px solid ${s.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>
                  {s.icon}
                </div>
                <span style={{ fontSize: 14, color: T.text, fontWeight: 500 }}>{s.text}</span>
              </button>
            ))}
          </div>
        </aside>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>

      {/* Header */}
      <div style={{
        padding: isDesktop ? '18px 22px 14px' : '16px 16px 12px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.orange})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>⚡</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>AI Poradce</div>
            <div style={{ fontSize: 11, color: T.muted }}>Claude · vidí tvá dnešní data</div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            style={{
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
              color: T.muted, fontSize: 11, padding: '6px 10px', cursor: 'pointer',
            }}
          >
            Smazat historii
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isDesktop ? '20px 22px 0' : '16px 16px 0' }}>
        <div style={{ maxWidth: isDesktop ? 900 : 'none', margin: isDesktop ? '0 auto' : undefined }}>

        {isEmpty && !isDesktop && (
          <div>
            <div style={{
              background: 'linear-gradient(135deg, #0f0f0f, #080808)',
              border: `1px solid ${BRAND.gold}22`,
              borderRadius: 18, padding: '20px 18px', marginBottom: 20,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 14 }}>
                <MetricBox label="Cíl" value={Math.round(goals.kcal)} variant="warning" />
                <MetricBox label="Jídlo" value={Math.round(totals.kcal)} variant="default" />
                <MetricBox label="Typ" value={trainingDay?.training_type ?? 'rest'} variant="analytics" />
              </div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7 }}>
                Zeptej se na <span style={{ color: BRAND.gold, fontWeight: 600 }}>výživu</span>,{' '}
                <span style={{ color: BRAND.orange, fontWeight: 600 }}>trénink</span> nebo{' '}
                <span style={{ color: BRAND.green, fontWeight: 600 }}>regeneraci</span>.
                Automaticky vidím tvá dnešní data a záznamy v deníku.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s.text}
                  onClick={() => send(s.text)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 14,
                    background: s.color + '0d', border: `1px solid ${s.color}28`,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: s.color + '18', border: `1px solid ${s.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>
                    {s.icon}
                  </div>
                  <span style={{ fontSize: 14, color: T.text, fontWeight: 500 }}>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} style={{
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 12, alignItems: 'flex-start',
          }}>
            {m.role === 'model' && (
              <div style={{
                width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.orange})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, marginRight: 8, marginTop: 2,
              }}>⚡</div>
            )}
            <div style={{ maxWidth: m.role === 'user' ? (isDesktop ? '68%' : '80%') : (isDesktop ? '78%' : '80%'), minWidth: 0 }}>
              <div style={{
                padding:      '11px 14px',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                background:   m.role === 'user'
                  ? `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.orange})`
                  : T.card,
                border:       m.role === 'user' ? 'none' : `1px solid ${T.border}`,
                color:        m.role === 'user' ? '#000' : T.text,
                fontSize:     14, lineHeight: 1.65,
                wordBreak:    'break-word',
              }}>
                {m.role === 'model' ? renderMarkdown(m.content, accent) : m.content}
              </div>

              {/* Food action */}
              {m.foodAction && !actioned.has(m.id) && (
                <button
                  onClick={() => handleLog(m.id, m.foodAction!.query, m.foodAction!.grams)}
                  style={{
                    marginTop: 6, padding: '8px 14px', borderRadius: 10, width: '100%',
                    background: BRAND.green + '12', border: `1px solid ${BRAND.green}40`,
                    color: BRAND.green, fontSize: 13, cursor: 'pointer', fontWeight: 600,
                    textAlign: 'left',
                  }}
                >
                  + Přidat {m.foodAction.grams}g · {m.foodAction.query} do deníku
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
                    marginTop: 6, padding: '8px 14px', borderRadius: 10, width: '100%',
                    background: (m.diaryAction.type === 'delete' ? BRAND.red : BRAND.blue) + '12',
                    border: `1px solid ${(m.diaryAction.type === 'delete' ? BRAND.red : BRAND.blue)}40`,
                    color: m.diaryAction.type === 'delete' ? BRAND.red : BRAND.blue,
                    fontSize: 13, cursor: 'pointer', fontWeight: 600, textAlign: 'left',
                  }}
                >
                  {m.diaryAction.type === 'delete'
                    ? `🗑 Smazat ${m.diaryAction.foodName} z deníku`
                    : `✏️ Upravit ${m.diaryAction.foodName} na ${m.diaryAction.grams}g`
                  }
                </button>
              )}

              {/* Goals action */}
              {m.goalsAction && !actioned.has(m.id) && (
                <button
                  onClick={() => handleGoalsAction(m.id, m.goalsAction!)}
                  style={{
                    marginTop: 6, padding: '8px 14px', borderRadius: 10, width: '100%',
                    background: BRAND.gold + '15', border: `1px solid ${BRAND.gold}40`,
                    color: BRAND.gold, fontSize: 13, cursor: 'pointer', fontWeight: 600,
                    textAlign: 'left',
                  }}
                >
                  🎯 Použít nové cíle:{' '}
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
                <div style={{
                  marginTop: 8, borderRadius: 12,
                  background: BRAND.green + '0a', border: `1px solid ${BRAND.green}30`,
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '10px 14px 6px', fontSize: 11, fontWeight: 700, color: BRAND.green, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    📋 Jídelníček na dnes · {m.mealPlanAction.reduce((s, x) => s + x.kcal, 0)} kcal
                  </div>
                  {m.mealPlanAction.map((meal, i) => (
                    <div key={i} style={{
                      padding: '6px 14px',
                      borderTop: i === 0 ? `1px solid ${BRAND.green}20` : undefined,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 11, color: T.muted }}>{SLOT_LABELS[meal.slot] ?? meal.slot}</div>
                        <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{meal.name}</div>
                        <div style={{ fontSize: 11, color: T.muted }}>
                          S: {meal.carbs}g · B: {meal.protein}g · T: {meal.fat}g
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.green }}>{meal.kcal}</div>
                        <div style={{ fontSize: 10, color: T.muted }}>kcal</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '10px 14px 12px' }}>
                    <button
                      onClick={() => handleMealPlan(m.id, m.mealPlanAction!)}
                      style={{
                        width: '100%', padding: '10px', borderRadius: 10,
                        background: BRAND.green + '20', border: `1px solid ${BRAND.green}50`,
                        color: BRAND.green, fontSize: 13, cursor: 'pointer', fontWeight: 700,
                      }}
                    >
                      + Zapsat všechna jídla do deníku
                    </button>
                  </div>
                </div>
              )}

              {/* Recipe suggestion action */}
              {m.recipeAction && !actioned.has(m.id) && (
                <div style={{
                  marginTop: 8, borderRadius: 12,
                  background: BRAND.orange + '0a', border: `1px solid ${BRAND.orange}30`,
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '10px 14px 6px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 2 }}>
                      👨‍🍳 {m.recipeAction.name}
                    </div>
                    {m.recipeAction.prep_time && (
                      <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>⏱ {m.recipeAction.prep_time}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      {[
                        { label: 'kcal', val: m.recipeAction.macros.kcal, color: BRAND.orange },
                        { label: 'S', val: `${m.recipeAction.macros.carbs}g`, color: BRAND.gold },
                        { label: 'B', val: `${m.recipeAction.macros.protein}g`, color: BRAND.green },
                        { label: 'T', val: `${m.recipeAction.macros.fat}g`, color: BRAND.red },
                      ].map(x => (
                        <div key={x.label} style={{
                          flex: 1, background: T.bg, borderRadius: 8, padding: '6px 4px', textAlign: 'center',
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: x.color }}>{x.val}</div>
                          <div style={{ fontSize: 9, color: T.muted }}>{x.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>
                      {m.recipeAction.ingredients.map(i => `${i.name} (${i.grams}g)`).join(' · ')}
                    </div>
                    {m.recipeAction.cycling_note && (
                      <div style={{ fontSize: 11, color: BRAND.orange, marginTop: 4 }}>
                        🚴 {m.recipeAction.cycling_note}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '6px 14px 12px' }}>
                    <button
                      onClick={() => handleRecipe(m.id, m.recipeAction!)}
                      style={{
                        width: '100%', padding: '10px', borderRadius: 10,
                        background: BRAND.orange + '20', border: `1px solid ${BRAND.orange}50`,
                        color: BRAND.orange, fontSize: 13, cursor: 'pointer', fontWeight: 700,
                      }}
                    >
                      + Přidat recept do deníku · {m.recipeAction.macros.kcal} kcal
                    </button>
                  </div>
                </div>
              )}

              {/* Done state */}
              {(m.foodAction || m.diaryAction || m.goalsAction || m.mealPlanAction || m.recipeAction) && actioned.has(m.id) && (
                <div style={{ marginTop: 6, fontSize: 12, color: BRAND.green, fontWeight: 600 }}>
                  ✓ Hotovo
                </div>
              )}

              <div style={{ fontSize: 10, color: T.muted, marginTop: 4, paddingLeft: 2 }}>
                {new Date(m.ts).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 10, flexShrink: 0,
              background: `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.orange})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            }}>⚡</div>
            <div style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: '4px 16px 16px 16px', padding: '12px 16px',
            }}>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
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
            background: BRAND.red + '18', border: `1px solid ${BRAND.red}33`,
            borderRadius: 12, padding: '10px 14px', marginBottom: 12,
            fontSize: 13, color: BRAND.red,
          }}>
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{
        padding: isDesktop ? '14px 22px 18px' : '12px 16px 16px',
        borderTop: `1px solid ${T.border}`,
        background: T.bg,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: isDesktop ? 900 : 'none', margin: isDesktop ? '0 auto' : undefined }}>
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
              borderRadius: 16, padding: '10px 14px', color: T.text,
              fontSize: 14, outline: 'none', resize: 'none',
              lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
              transition: 'border-color 0.2s',
            }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: input.trim() && !loading
                ? `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.orange})`
                : T.border,
              border: 'none',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: input.trim() && !loading ? '#000' : T.muted,
              fontSize: 18, fontWeight: 700, transition: 'background 0.2s',
            }}
          >
            ↑
          </button>
        </div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 6, textAlign: 'center' }}>
          Powered by Claude (Anthropic) · Sdílená historie mezi stránkami
        </div>
      </div>

      <style>{`
        @keyframes chatBounce {
          0%, 80%, 100% { transform: scale(0.3); opacity: 0.3; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
      </div>
    </div>
  );
}
