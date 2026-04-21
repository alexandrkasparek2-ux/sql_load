import { useRef, useEffect, useContext, useState, useCallback } from 'react';
import { AppContext } from '../App';
import { T, BRAND } from '../components/UI';
import { useChatSession } from '../hooks/useChatSession';
import { showToast } from '../components/Toast';
import { FOODS, type Food } from '../constants/foods';
import type { FoodEntry } from '../hooks/useFoodEntries';

const SUGGESTIONS = [
  { text: 'Co mám dát k večeři?',    icon: '🍽️', color: BRAND.orange },
  { text: 'Mám dost bílkovin?',       icon: '💪', color: BRAND.purple },
  { text: 'Co jíst před tréninkem?',  icon: '⚡', color: BRAND.gold   },
  { text: 'Co jíst po tréninku?',     icon: '🔄', color: BRAND.blue   },
  { text: 'Jak doplnit sacharidy?',   icon: '🍌', color: BRAND.green  },
  { text: 'Proč jsem unavený?',       icon: '😴', color: BRAND.red    },
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
    user_id: userId, date, meal_slot: 'snack',
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

export default function Chat() {
  const ctx = useContext(AppContext);
  const { accent, addEntry, userId, today } = ctx;
  const { messages, input, setInput, loading, error, send, clearHistory } = useChatSession(ctx);
  const [logged, setLogged] = useState<Set<string>>(new Set());

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleLog = useCallback(async (msgId: string, query: string, grams: number) => {
    const food = matchFood(query);
    if (!food) { showToast('Potravina nenalezena v databázi', 'error'); return; }
    await addEntry(buildFoodEntry(food, grams, userId, today));
    setLogged(prev => new Set([...prev, msgId]));
    showToast(`${food.name} přidáno`);
  }, [addEntry, userId, today]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 120px)' }}>

      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
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
            <div style={{ fontSize: 11, color: T.muted }}>Gemini · vidí tvá dnešní data</div>
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

        {isEmpty && (
          <div>
            {/* Intro card */}
            <div style={{
              background: 'linear-gradient(135deg, #0f0f0f, #080808)',
              border: `1px solid ${BRAND.gold}22`,
              borderRadius: 18, padding: '20px 18px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7 }}>
                Zeptej se na <span style={{ color: BRAND.gold, fontWeight: 600 }}>výživu</span>,{' '}
                <span style={{ color: BRAND.orange, fontWeight: 600 }}>trénink</span> nebo{' '}
                <span style={{ color: BRAND.green, fontWeight: 600 }}>regeneraci</span>.
                Automaticky vidím tvá dnešní data.
              </div>
            </div>

            {/* Suggestions */}
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
            <div style={{ maxWidth: '80%', minWidth: 0 }}>
              <div style={{
                padding:      '11px 14px',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                background:   m.role === 'user'
                  ? `linear-gradient(135deg, ${BRAND.gold}, ${BRAND.orange})`
                  : T.card,
                border:       m.role === 'user' ? 'none' : `1px solid ${T.border}`,
                color:        m.role === 'user' ? '#000' : T.text,
                fontSize:     14, lineHeight: 1.6,
                whiteSpace:   'pre-wrap', wordBreak: 'break-word',
              }}>
                {m.content}
              </div>

              {m.foodAction && !logged.has(m.id) && (
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
              {m.foodAction && logged.has(m.id) && (
                <div style={{ marginTop: 6, fontSize: 12, color: BRAND.green, fontWeight: 600 }}>
                  ✓ Přidáno do deníku
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

      {/* Input */}
      <div style={{
        padding: '12px 16px 16px',
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
          Powered by Google Gemini · Sdílená historie mezi stránkami
        </div>
      </div>

      <style>{`
        @keyframes chatBounce {
          0%, 80%, 100% { transform: scale(0.3); opacity: 0.3; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
