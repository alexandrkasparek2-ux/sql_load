import { useState, useCallback, useEffect } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import type { AppCtx } from '../App';

const HISTORY_KEY = 'cyclofuel_chat_v1';
const MAX_STORED  = 80;

const MEAL_SLOT_LABELS: Record<string, string> = {
  snidane: 'Snídaně', dop_svacina: 'Dop. svačina', obed: 'Oběd',
  odp_svacina: 'Odp. svačina', pred_tren: 'Před tréninkem',
  behem_tren: 'Během tréninku', po_tren: 'Po tréninku', vecere: 'Večeře',
};

export interface DiaryAction {
  type:     'delete' | 'edit';
  entryId:  string;
  foodName: string;
  grams?:   number; // for edit
}

export interface ChatMessage {
  id:           string;
  role:         'user' | 'model';
  content:      string;
  ts:           number;
  foodAction?:  { query: string; grams: number };
  diaryAction?: DiaryAction;
}

function loadHistory(): ChatMessage[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); }
  catch { return []; }
}

function saveHistory(msgs: ChatMessage[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs.slice(-MAX_STORED)));
}

function buildContext(ctx: AppCtx): string {
  const { profile, goals, totals, trainingDay, entries } = ctx;
  if (!profile) return 'Profil není vyplněn.';
  const trainLabel: Record<string, string> = {
    rest: 'Odpočinkový den', easy: 'Lehký výjezd',
    moderate: 'Střední výjezd', hard: 'Těžký výjezd', race: 'Závodní den',
  };
  const type = trainingDay?.training_type ?? 'rest';
  const h    = trainingDay?.ride_hours    ?? 0;
  const rem  = Math.max(0, Math.round(goals.kcal - totals.kcal));

  const diaryLines = entries.length === 0
    ? 'Deník dnes prázdný.'
    : entries.map(e =>
        `  [${e.id}] ${MEAL_SLOT_LABELS[e.meal_slot] ?? e.meal_slot}: ${e.food_name} ${e.grams}g = ${Math.round(e.kcal)} kcal (S:${e.carbs}g B:${e.protein}g T:${e.fat}g)`
      ).join('\n');

  return [
    `Cyklista: ${profile.weight}kg, ${profile.height}cm, ${profile.age}let, ${profile.gender === 'male' ? 'muž' : 'žena'}`,
    `Trénink: ${trainLabel[type] ?? type}${h > 0 ? ` ${h}h` : ''}`,
    `Příjem dnes: ${Math.round(totals.kcal)}/${Math.round(goals.kcal)} kcal (zbývá ${rem})`,
    `Makra: S: ${totals.carbs.toFixed(0)}/${goals.carbs}g  B: ${totals.protein.toFixed(0)}/${goals.protein}g  T: ${totals.fat.toFixed(0)}/${goals.fat}g`,
    `Záznamy v deníku dnes:\n${diaryLines}`,
  ].join('\n');
}

const FOOD_RE   = /```food-action\s*([\s\S]*?)\s*```/;
const DELETE_RE = /```delete-entry\s*([\s\S]*?)\s*```/;
const EDIT_RE   = /```edit-entry\s*([\s\S]*?)\s*```/;

const SYSTEM_PROMPT = `Jsi výživový poradce specializovaný na cyklistiku. Odpovídej stručně, prakticky, česky. Nepoužívej markdown (žádné ##, **, atd.) – prostý text.

Pravidla:
- Zohledni tréninkový typ a cíle dne
- Doporučuj konkrétní potraviny nebo množství
- Nejdi úvody jako "Samozřejmě!" – jdi rovnou k věci
- Vidíš záznamy deníku s jejich ID v hranatých závorkách [uuid]

Akce které SMÍŠ provádět (vždy jen 1 akci na konci odpovědi):

1. Přidat jídlo (slova: "přidej", "zaloguj", "přidal jsem"):
\`\`\`food-action
{"query":"název potraviny česky","grams":množství}
\`\`\`

2. Smazat záznam (slova: "smaž", "odstraň", "vymaž" + název nebo ID):
\`\`\`delete-entry
{"id":"uuid záznamu","food_name":"název pro potvrzení"}
\`\`\`

3. Upravit gramáž záznamu (slova: "uprav", "změň", "bylo to", "oprav"):
\`\`\`edit-entry
{"id":"uuid záznamu","food_name":"název pro potvrzení","grams":nová gramáž}
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

    const modelId = `m_${Date.now()}`;
    setMessages(prev => [...prev, { id: modelId, role: 'model', ts: Date.now(), content: '' }]);

    try {
      const key = localStorage.getItem('anthropic_api_key') || (import.meta.env.VITE_ANTHROPIC_API_KEY as string);
      if (!key) throw new Error('Vlož Anthropic API klíč v Nastavení → AI Poradce');

      const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });

      const history = updated.slice(-20).map(m => ({
        role:    m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

      let fullText = '';

      const stream = client.messages.stream({
        model:      'claude-opus-4-7',
        max_tokens: 1024,
        thinking:   { type: 'adaptive' },
        system: [
          {
            type:          'text',
            text:          SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
          {
            type: 'text',
            text: `Aktuální data uživatele:\n${buildContext(ctx)}`,
          },
        ],
        messages: history,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          fullText += event.delta.text;
          setMessages(prev => prev.map(m => m.id === modelId ? { ...m, content: fullText } : m));
        }
      }

      // Parse action blocks
      let foodAction:  ChatMessage['foodAction'];
      let diaryAction: ChatMessage['diaryAction'];

      const foodMatch = FOOD_RE.exec(fullText);
      if (foodMatch) {
        try {
          const p = JSON.parse(foodMatch[1]) as { query: string; grams: number };
          foodAction = { query: p.query, grams: Number(p.grams) || 100 };
          fullText = fullText.replace(FOOD_RE, '').trim();
        } catch { /* skip */ }
      }

      const deleteMatch = DELETE_RE.exec(fullText);
      if (deleteMatch) {
        try {
          const p = JSON.parse(deleteMatch[1]) as { id: string; food_name: string };
          diaryAction = { type: 'delete', entryId: p.id, foodName: p.food_name };
          fullText = fullText.replace(DELETE_RE, '').trim();
        } catch { /* skip */ }
      }

      const editMatch = EDIT_RE.exec(fullText);
      if (editMatch) {
        try {
          const p = JSON.parse(editMatch[1]) as { id: string; food_name: string; grams: number };
          diaryAction = { type: 'edit', entryId: p.id, foodName: p.food_name, grams: Number(p.grams) };
          fullText = fullText.replace(EDIT_RE, '').trim();
        } catch { /* skip */ }
      }

      setMessages(prev =>
        prev.map(m => m.id === modelId ? { ...m, content: fullText, foodAction, diaryAction } : m)
      );
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== modelId));
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, ctx]);

  return { messages, input, setInput, loading, error, send, clearHistory };
}
