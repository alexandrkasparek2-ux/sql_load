import { useState, useCallback, useEffect } from 'react';
import Anthropic from '@anthropic-ai/sdk';
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

const SYSTEM_PROMPT = `Jsi výživový poradce specializovaný na cyklistiku. Odpovídej stručně, prakticky, česky.

Pravidla:
- Zohledni tréninkový typ a cíle dne
- Doporučuj konkrétní potraviny nebo množství
- Nejdi úvody jako "Samozřejmě!" – jdi rovnou k věci
- Pokud uživatel chce přidat jídlo do deníku (slova: "přidej", "zaloguj", "přidal jsem", "dej mi"), přidej na KONEC odpovědi blok:
\`\`\`food-action
{"query":"název potraviny česky","grams":množství jako číslo}
\`\`\``;

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

    // Placeholder for streaming response
    const modelId = `m_${Date.now()}`;
    setMessages(prev => [...prev, { id: modelId, role: 'model', ts: Date.now(), content: '' }]);

    try {
      const key = localStorage.getItem('anthropic_api_key') || (import.meta.env.VITE_ANTHROPIC_API_KEY as string);
      if (!key) throw new Error('Vlož Anthropic API klíč v Nastavení → AI Poradce');

      const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });

      const contextBlock = buildContext(ctx);

      // Convert history to Anthropic message format (last 20 messages)
      const history = updated.slice(-20).map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

      let fullText = '';

      const stream = client.messages.stream({
        model:      'claude-opus-4-7',
        max_tokens: 1024,
        thinking:   { type: 'adaptive' },
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
          {
            type: 'text',
            text: `Aktuální data uživatele:\n${contextBlock}`,
          },
        ],
        messages: history,
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          fullText += event.delta.text;
          // Update streaming message in place
          setMessages(prev =>
            prev.map(m => m.id === modelId ? { ...m, content: fullText } : m)
          );
        }
      }

      // Parse food action from completed response
      let foodAction: ChatMessage['foodAction'];
      const match = FOOD_RE.exec(fullText);
      if (match) {
        try {
          const p = JSON.parse(match[1]) as { query: string; grams: number };
          foodAction = { query: p.query, grams: Number(p.grams) || 100 };
          fullText = fullText.replace(FOOD_RE, '').trim();
        } catch { /* malformed JSON, skip */ }
      }

      setMessages(prev =>
        prev.map(m => m.id === modelId ? { ...m, content: fullText, foodAction } : m)
      );
    } catch (e) {
      // Remove the placeholder message on error
      setMessages(prev => prev.filter(m => m.id !== modelId));
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, ctx]);

  return { messages, input, setInput, loading, error, send, clearHistory };
}
