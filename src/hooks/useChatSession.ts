import { useState, useCallback, useEffect } from 'react';
import type { AppCtx } from '../App';

const HISTORY_KEY = 'cyclofuel_chat_v1';
const MAX_STORED  = 80;

export interface ChatMessage {
  id:          string;
  role:        'user' | 'model';
  content:     string;
  ts:          number;
  foodAction?: { query: string; grams: number };
}

function loadHistory(): ChatMessage[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); }
  catch { return []; }
}

function saveHistory(msgs: ChatMessage[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs.slice(-MAX_STORED)));
}

function buildContext(ctx: AppCtx): string {
  const { profile, goals, totals, trainingDay } = ctx;
  if (!profile) return 'Profil není vyplněn.';
  const trainLabel: Record<string, string> = {
    rest: 'Odpočinkový den', easy: 'Lehký výjezd',
    moderate: 'Střední výjezd', hard: 'Těžký výjezd', race: 'Závodní den',
  };
  const type = trainingDay?.training_type ?? 'rest';
  const h    = trainingDay?.ride_hours    ?? 0;
  const rem  = Math.max(0, Math.round(goals.kcal - totals.kcal));
  return [
    `Cyklista: ${profile.weight}kg, ${profile.height}cm, ${profile.age}let, ${profile.gender === 'male' ? 'muž' : 'žena'}`,
    `Trénink: ${trainLabel[type] ?? type}${h > 0 ? ` ${h}h` : ''}`,
    `Příjem dnes: ${Math.round(totals.kcal)}/${Math.round(goals.kcal)} kcal (zbývá ${rem})`,
    `S: ${totals.carbs.toFixed(0)}/${goals.carbs}g  B: ${totals.protein.toFixed(0)}/${goals.protein}g  T: ${totals.fat.toFixed(0)}/${goals.fat}g`,
  ].join('\n');
}

const FOOD_RE = /```food-action\s*([\s\S]*?)\s*```/;

export function useChatSession(ctx: AppCtx) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory());
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => { saveHistory(messages); }, [messages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const send = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;

    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', ts: Date.now(), content: t };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const key = import.meta.env.VITE_GEMINI_API_KEY as string;
      if (!key) throw new Error('Gemini API klíč není nastaven');

      const sys = `Jsi výživový poradce specializovaný na cyklistiku. Odpovídej stručně, prakticky, česky.
Aktuální data uživatele:
${buildContext(ctx)}

Pravidla:
- Zohledni tréninkový typ a cíle dne
- Doporučuj konkrétní potraviny nebo množství
- Nejdi úvody jako "Samozřejmě!" – jdi rovnou k věci
- Pokud uživatel chce přidat jídlo do deníku (slova: "přidej", "zaloguj", "přidal jsem", "dej mi"), přidej na KONEC odpovědi blok:
\`\`\`food-action
{"query":"název potraviny česky","grams":množství jako číslo}
\`\`\``;

      const contents = [
        { role: 'user',  parts: [{ text: sys }] },
        { role: 'model', parts: [{ text: 'Rozumím, jsem připraven.' }] },
        ...updated.slice(-20).map(m => ({ role: m.role, parts: [{ text: m.content }] })),
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 500 } }),
        }
      );

      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(e.error?.message ?? `Chyba ${res.status}`);
      }

      const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
      let reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Nepodařilo se získat odpověď.';

      let foodAction: ChatMessage['foodAction'];
      const m = FOOD_RE.exec(reply);
      if (m) {
        try {
          const p = JSON.parse(m[1]) as { query: string; grams: number };
          foodAction = { query: p.query, grams: Number(p.grams) || 100 };
          reply = reply.replace(FOOD_RE, '').trim();
        } catch { /* malformed JSON, skip */ }
      }

      setMessages(prev => [...prev, {
        id: `m_${Date.now()}`, role: 'model', ts: Date.now(), content: reply, foodAction,
      }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, ctx]);

  return { messages, input, setInput, loading, error, send, clearHistory };
}
