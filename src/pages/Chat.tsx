import { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import type { AppCtx } from '../App';
import { T } from '../components/UI';

interface Message {
  role:    'user' | 'model';
  content: string;
}

// Quick suggestion chips
const SUGGESTIONS = [
  'Co mám dát k večeři?',
  'Mám dost bílkovin?',
  'Co jíst před tréninkem?',
  'Co jíst po tréninku?',
  'Jak doplnit sacharidy?',
  'Proč jsem unavený?',
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
  const { accent } = ctx;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new message
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
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context:  buildContext(ctx),
        }),
      });

      const text = await res.text();
      let data: { reply?: string; error?: string } = {};
      try { data = JSON.parse(text); } catch {
        throw new Error(`Server vrátil neplatnou odpověď (${res.status}). Zkus to znovu.`);
      }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Chyba serveru');

      setMessages(prev => [...prev, { role: 'model', content: data.reply! }]);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 64px)', padding: '0' }}>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

        {/* Empty state */}
        {isEmpty && (
          <div style={{ textAlign: 'center', paddingTop: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>
              Výživový poradce
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 24, maxWidth: 280, margin: '0 auto 24px' }}>
              Zeptej se na cokoliv ohledně výživy, tréninku nebo dnešního jídelníčku.
            </div>

            {/* Suggestion chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    padding: '8px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                    background: accent + '18', border: `1px solid ${accent}44`, color: accent,
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display:       'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom:  10,
            }}
          >
            {m.role === 'model' && (
              <div style={{ width: 28, height: 28, borderRadius: 14, background: accent + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginRight: 8, marginTop: 2 }}>
                🤖
              </div>
            )}
            <div
              style={{
                maxWidth:     '78%',
                padding:      '10px 14px',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background:   m.role === 'user' ? accent : T.card,
                border:       m.role === 'user' ? 'none' : `1px solid ${T.border}`,
                color:        m.role === 'user' ? '#fff' : T.text,
                fontSize:     14,
                lineHeight:   1.5,
                whiteSpace:   'pre-wrap',
                wordBreak:    'break-word',
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: accent + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              🤖
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '16px 16px 16px 4px', padding: '10px 16px' }}>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: 3, background: accent,
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#ef444420', border: '1px solid #ef444440', borderRadius: 10, padding: '10px 14px', marginBottom: 10, fontSize: 13, color: '#ef4444' }}>
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${T.border}`, background: T.bg, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napiš dotaz… (Enter = odeslat)"
            rows={1}
            style={{
              flex: 1, background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
              padding: '10px 14px', color: T.text, fontSize: 14, outline: 'none',
              resize: 'none', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5,
              maxHeight: 120, overflowY: 'auto',
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
              width: 40, height: 40, borderRadius: 20, flexShrink: 0,
              background: !input.trim() || loading ? T.border : accent,
              border: 'none', cursor: !input.trim() || loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, transition: 'background 0.15s',
            }}
          >
            ↑
          </button>
        </div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 6, textAlign: 'center' }}>
          Powered by Google Gemini · Automaticky vidí dnešní data
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
