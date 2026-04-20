import { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import type { AppCtx } from '../App';
import { T, BRAND } from '../components/UI';

interface Message {
  role:    'user' | 'model';
  content: string;
}

const SUGGESTIONS = [
  { icon: '⚡', color: BRAND.gold,   text: 'Co jíst před tréninkem?' },
  { icon: '💪', color: BRAND.green,  text: 'Mám dost bílkovin?' },
  { icon: '🔥', color: BRAND.orange, text: 'Proč jsem unavený?' },
  { icon: '🍽️', color: BRAND.blue,   text: 'Co mám dát k večeři?' },
  { icon: '🚴', color: BRAND.gold,   text: 'Jak doplnit sacharidy?' },
  { icon: '💤', color: BRAND.purple, text: 'Co jíst po tréninku?' },
];

function buildContext(ctx: AppCtx): string {
  const { profile, goals, totals, trainingDay } = ctx;
  const p = profile;
  if (!p) return 'Profil není vyplněn.';

  const trainingType = trainingDay?.training_type ?? 'rest';
  const rideHours    = trainingDay?.ride_hours    ?? 0;

  const trainLabel: Record<string, string> = {
    rest:     'Odpočinkový den',
    easy:     'Lehký výjezd',
    moderate: 'Střední výjezd',
    hard:     'Těžký výjezd',
    race:     'Závodní den',
  };

  const remaining = Math.max(0, Math.round(goals.kcal - totals.kcal));

  return [
    `Sportovec: cyklista`,
    `Váha: ${p.weight} kg, Výška: ${p.height} cm, Věk: ${p.age} let`,
    `Pohlaví: ${p.gender === 'male' ? 'muž' : 'žena'}`,
    `Dnešní trénink: ${trainLabel[trainingType] ?? trainingType}${rideHours > 0 ? ` (${rideHours}h)` : ''}`,
    ``,
    `Dnešní příjem:`,
    `  Kalorie: ${Math.round(totals.kcal)} / ${Math.round(goals.kcal)} kcal (zbývá ${remaining} kcal)`,
    `  Sacharidy: ${totals.carbs.toFixed(0)}g / ${goals.carbs}g`,
    `  Bílkoviny: ${totals.protein.toFixed(0)}g / ${goals.protein}g`,
    `  Tuky: ${totals.fat.toFixed(0)}g / ${goals.fat}g`,
    `  Vláknina: ${totals.fiber.toFixed(1)}g / ${goals.fiber}g`,
    `  Voda: ${ctx.trainingDay?.water_glasses ? `${ctx.trainingDay.water_glasses} sklenic` : 'nezaznamenáno'}`,
  ].join('\n');
}

export default function Chat() {
  const ctx = useContext(AppContext);
  const { accent, goals, totals, trainingDay } = ctx;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
      if (!apiKey) throw new Error('API klíč není nastaven');

      const systemPrompt = `Jsi výživový poradce specializovaný na cyklistiku a vytrvalostní sporty.
Odpovídáš stručně, prakticky a v češtině. Nepoužívej zbytečně dlouhé odpovědi.

Aktuální data uživatele:
${buildContext(ctx)}

Pravidla:
- Vždy zohledni tréninkový typ a cíl dne
- Doporučuj konkrétní potraviny nebo množství
- Pokud chybí data, řekni co by uživatel měl zadat
- Nepiš úvody jako "Samozřejmě!" nebo "Výborně!" – jdi rovnou k věci`;

      const contents = [
        { role: 'user',  parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Rozumím. Jsem připraven radit s výživou pro cyklistiku.' }] },
        ...newMessages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 500, topP: 0.9 },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? `Gemini error ${res.status}`);
      }

      const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Nepodařilo se získat odpověď.';
      setMessages(prev => [...prev, { role: 'model', content: reply }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const isEmpty = messages.length === 0;

  const trainType = trainingDay?.training_type ?? 'rest';
  const trainLabel: Record<string, string> = {
    rest: 'odpočinkový den', easy: 'lehký výjezd',
    moderate: 'střední výjezd', hard: 'těžký výjezd', race: 'závodní den',
  };
  const remaining = Math.max(0, Math.round(goals.kcal - totals.kcal));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 64px)' }}>

      {/* Messages / empty state area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

        {isEmpty && (
          <>
            {/* Hero intro card */}
            <div className="stagger-1" style={{
              background: 'linear-gradient(180deg, #0f0f0f, #080808)',
              border: `1px solid rgba(255,214,0,0.15)`,
              borderRadius: 22, padding: '20px 16px 18px',
              marginBottom: 14, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at top left, rgba(255,214,0,0.05), transparent 60%)',
                pointerEvents: 'none',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: 'linear-gradient(135deg, #FFD600, #FF6B35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                  boxShadow: '0 0 20px rgba(255,214,0,0.25)',
                }}>
                  ⚡
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 2 }}>
                    AI Výživový poradce
                  </div>
                  <div style={{ fontSize: 11, color: T.muted }}>
                    Vidím tvá dnešní data · {trainLabel[trainType] ?? trainType}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                Máš přijato <span style={{ color: BRAND.gold, fontWeight: 600 }}>{Math.round(totals.kcal)} kcal</span> ze{' '}
                <span style={{ color: T.text, fontWeight: 600 }}>{Math.round(goals.kcal)}</span>.{' '}
                {remaining > 0
                  ? <>Zbývá <span style={{ color: BRAND.green, fontWeight: 600 }}>{remaining} kcal</span> do cíle.</>
                  : <span style={{ color: BRAND.green, fontWeight: 600 }}>Cíl splněn! 🎉</span>
                }
                {' '}Jak ti můžu pomoct?
              </div>
            </div>

            {/* Context grid */}
            <div className="stagger-2" style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 8, marginBottom: 20,
            }}>
              {[
                { label: 'Dnešní cíl',  value: `${Math.round(goals.kcal)} kcal`, color: BRAND.gold   },
                { label: 'Snědeno',     value: `${Math.round(totals.kcal)} kcal`, color: BRAND.green  },
                { label: 'Trénink',     value: trainLabel[trainType] ?? trainType, color: accent        },
                { label: 'Sacharidy',   value: `${totals.carbs.toFixed(0)} / ${goals.carbs} g`, color: BRAND.gold },
              ].map(item => (
                <div key={item.label} style={{
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 12, padding: '10px 12px',
                }}>
                  <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 4 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: item.color, fontVariantNumeric: 'tabular-nums' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Section label */}
            <div className="stagger-3" style={{
              fontSize: 9, color: T.muted, textTransform: 'uppercase',
              letterSpacing: '1.5px', fontWeight: 700, marginBottom: 10,
            }}>
              💡 Rychlé dotazy
            </div>

            {/* Suggestion chips */}
            <div className="stagger-3" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s.text}
                  onClick={() => send(s.text)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
                    background: s.color + '0e',
                    border: `1px solid ${s.color}25`,
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: s.color + '20',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14,
                  }}>
                    {s.icon}
                  </span>
                  <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{s.text}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 14, color: T.muted, opacity: 0.5 }}>›</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Message bubbles */}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}
          >
            {m.role === 'model' && (
              <div style={{
                width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, #FFD600, #FF6B35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, marginRight: 8, marginTop: 2,
              }}>
                ⚡
              </div>
            )}
            <div style={{
              maxWidth: '78%',
              padding: '10px 14px',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.role === 'user'
                ? 'linear-gradient(135deg, #FFD600, #FF6B35)'
                : T.card,
              border: m.role === 'user' ? 'none' : `1px solid ${T.border}`,
              color: m.role === 'user' ? '#000' : T.text,
              fontSize: 14,
              fontWeight: m.role === 'user' ? 500 : 400,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 10,
              background: 'linear-gradient(135deg, #FFD600, #FF6B35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>
              ⚡
            </div>
            <div style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: '16px 16px 16px 4px', padding: '12px 16px',
            }}>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%', background: BRAND.gold,
                    animation: `chatBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: BRAND.red + '18', border: `1px solid ${BRAND.red}33`,
            borderRadius: 12, padding: '10px 14px', marginBottom: 10,
            fontSize: 13, color: BRAND.red, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} style={{ height: 16 }} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: '10px 12px 14px',
        borderTop: `1px solid ${T.border}`,
        background: 'rgba(5,5,5,0.97)',
        backdropFilter: 'blur(20px)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napiš dotaz…"
            rows={1}
            style={{
              flex: 1,
              background: T.card,
              border: `1px solid ${input.trim() ? BRAND.gold + '44' : T.border}`,
              borderRadius: 16,
              padding: '10px 14px',
              color: T.text,
              fontSize: 14,
              outline: 'none',
              resize: 'none',
              lineHeight: 1.5,
              maxHeight: 120,
              overflowY: 'auto',
              transition: 'border-color 0.15s',
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
              background: !input.trim() || loading
                ? T.border
                : 'linear-gradient(135deg, #FFD600, #FF6B35)',
              border: 'none',
              cursor: !input.trim() || loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
              color: !input.trim() || loading ? T.muted : '#000',
              transition: 'background 0.2s',
            }}
          >
            ↑
          </button>
        </div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 6, textAlign: 'center', opacity: 0.7 }}>
          Powered by Google Gemini · Automaticky vidí dnešní data
        </div>
      </div>

      <style>{`
        @keyframes chatBounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
