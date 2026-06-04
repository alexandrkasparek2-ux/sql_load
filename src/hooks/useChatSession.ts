import { useState, useCallback, useEffect } from 'react';
import type { AppCtx } from '../App';
import type { PlannedWorkout } from '../services/trainingPeaksService';
import { classifyWorkout, calculateFuelingTargets, FUEL_TYPE_META } from '../services/fuelingPlanner';
import { getSetting } from './useUserSettings';

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
  grams?:   number;
}

export interface GoalsAction {
  kcal?:    number;
  carbs?:   number;
  protein?: number;
  fat?:     number;
  water?:   number;
}

export interface MealPlanItem {
  slot:    string;
  name:    string;
  grams:   number;
  kcal:    number;
  carbs:   number;
  protein: number;
  fat:     number;
}

export interface RecipeSuggestionAction {
  name:          string;
  servings:      number;
  ingredients:   { name: string; grams: number }[];
  macros:        { kcal: number; carbs: number; protein: number; fat: number };
  prep_time?:    string;
  cycling_note?: string;
}

export interface LogMealAction {
  slot:  string;
  items: { name: string; grams: number; kcal: number; carbs: number; protein: number; fat: number }[];
}

export interface ChatMessage {
  id:                    string;
  role:                  'user' | 'model';
  content:               string;
  ts:                    number;
  foodAction?:           { query: string; grams: number };
  diaryAction?:          DiaryAction;
  goalsAction?:          GoalsAction;
  mealPlanAction?:       MealPlanItem[];
  recipeAction?:         RecipeSuggestionAction;
  logMealAction?:        LogMealAction;
  actionApplied?:        boolean;
}

function loadHistory(): ChatMessage[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); }
  catch { return []; }
}

function saveHistory(msgs: ChatMessage[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs.slice(-MAX_STORED)));
}

interface TPContext {
  today?:    PlannedWorkout | null;
  tomorrow?: PlannedWorkout | null;
}

function buildContext(ctx: AppCtx, tp?: TPContext): string {
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

  const tpLines: string[] = [];
  if (tp?.today) {
    const w = tp.today;
    const wType = classifyWorkout(w);
    const targets = calculateFuelingTargets(w, wType);
    const meta = FUEL_TYPE_META[wType];
    tpLines.push(
      `TrainingPeaks dnes: "${w.title}" — ${meta.label}, ${w.durationMin > 0 ? `${w.durationMin} min` : 'délka neznámá'}${w.tss > 0 ? `, TSS ${w.tss}` : ''}`,
      `  Doporučení fueling: ${targets.carbsPerHourMin}–${targets.carbsPerHourMax} g sacharidů/h, celkem ${targets.totalCarbsDuring} g`,
      `  Tekutiny: ${targets.fluidsPerHourMl} ml/h | Před: ${targets.preWorkoutCarbs} g S + ${targets.preWorkoutProtein} g B | Po: ${targets.postWorkoutProtein} g B + ${targets.postWorkoutCarbs} g S`,
    );
  }
  if (tp?.tomorrow) {
    const w = tp.tomorrow;
    const wType = classifyWorkout(w);
    const meta = FUEL_TYPE_META[wType];
    tpLines.push(`TrainingPeaks zítra: "${w.title}" — ${meta.label}${w.durationMin > 0 ? `, ${w.durationMin} min` : ''}${w.tss > 0 ? `, TSS ${w.tss}` : ''}`);
  }

  return [
    `Cyklista: ${profile.weight}kg, ${profile.height}cm, ${profile.age}let, ${profile.gender === 'male' ? 'muž' : 'žena'}`,
    `Trénink (Intervals.icu): ${trainLabel[type] ?? type}${h > 0 ? ` ${h}h` : ''}`,
    ...(tpLines.length > 0 ? tpLines : ['TrainingPeaks: nepropojeno nebo žádný plán']),
    `Příjem dnes: ${Math.round(totals.kcal)}/${Math.round(goals.kcal)} kcal (zbývá ${rem})`,
    `Makra: S: ${totals.carbs.toFixed(0)}/${goals.carbs}g  B: ${totals.protein.toFixed(0)}/${goals.protein}g  T: ${totals.fat.toFixed(0)}/${goals.fat}g`,
    `Záznamy v deníku dnes:\n${diaryLines}`,
  ].join('\n');
}

const FOOD_RE      = /```food-action\s*([\s\S]*?)\s*```/;
const DELETE_RE    = /```delete-entry\s*([\s\S]*?)\s*```/;
const EDIT_RE      = /```edit-entry\s*([\s\S]*?)\s*```/;
const GOALS_RE     = /```set-goals\s*([\s\S]*?)\s*```/;
const MEAL_PLAN_RE = /```meal-plan\s*([\s\S]*?)\s*```/;
const RECIPE_RE    = /```recipe-suggestion\s*([\s\S]*?)\s*```/;
const LOG_MEAL_RE  = /```log-meal\s*([\s\S]*?)\s*```/;

const MEAL_RE = /snědl|snědla|jedl|jedla|měl\s+jsem|měla\s+jsem|jsem\s+měl|jsem\s+měla|dal\s+jsem\s+si|dala\s+jsem\s+si|dám\s+si|zapiš|zaloguj|loguj|k\s+obědu|k\s+snídani|k\s+večeři|svačin|nadiktuj|zapsat|obědvám|večeřím|snídám|přidávám|přidat\s+na|chci\s+přidat|chci\s+zalogovat|mám\s+k|mám\s+na/i;

async function extractMealsViaHaiku(userText: string, apiKey: string): Promise<LogMealAction | undefined> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: `Jsi extractor jídel. Uživatel napsal co jedl nebo co přidává do deníku. Extrahuj jídla jako JSON.
Odpověz POUZE tímto JSON objektem, žádný jiný text:
{"slot":"vecere","items":[{"name":"Šnek","grams":55,"kcal":120,"carbs":8,"protein":6,"fat":7}]}

Mapování slotů (použij PŘESNĚ tato ID):
- snídaně / ráno / k snídani → snidane
- dopolední svačina / dopoledne → dop_svacina
- oběd / k obědu / na oběd / v poledne → obed
- odpolední svačina / svačina / odpoledne → odp_svacina
- před tréninkem → pred_tren
- během tréninku → behem_tren
- po tréninku → po_tren
- večeře / k večeři / na večeři / večer / do večeře → vecere

Pokud uživatel explicitně říká slot (např. "na večeři"), VŽDY použij ten slot.
Chybí-li gramáž → odhadni typickou porci. Odhadni makra z vlastní znalosti.
Pokud text neobsahuje žádná jídla, vrať: {"slot":"obed","items":[]}`,
        messages: [{ role: 'user', content: userText }],
      }),
    });
    if (!res.ok) return undefined;
    const data = await res.json() as { content?: { type: string; text: string }[] };
    const raw = data.content?.find(c => c.type === 'text')?.text?.trim() ?? '';
    const clean = raw.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'').trim();
    const parsed = JSON.parse(clean) as LogMealAction;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

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

3. Upravit gramáž existujícího záznamu (slova: "uprav", "změň", "bylo to", "oprav", "nakonec", "místo 100 g jsem měl 130 g"):
\`\`\`edit-entry
{"id":"uuid záznamu","food_name":"název pro potvrzení","grams":nová gramáž}
\`\`\`
(Při formulaci "nakonec jsem místo X g jídla měl Y g jídla" VŽDY uprav existující záznam, NIKDY nepřidávej nový.)
(Najdi záznam podle názvu jídla, slotu jako "na oběd" a původní gramáže X. Pokud existuje více možných záznamů, zeptej se a neprováděj žádnou akci.)

4. Nastavit denní cíle (slova: "nastav cíle", "změň cíle", "uprav cíle", "chci jíst", "snižme kalorie", "zvyšme bílkoviny"):
\`\`\`set-goals
{"kcal":číslo,"carbs":číslo,"protein":číslo,"fat":číslo,"water":číslo}
\`\`\`
(uveď jen pole která chceš změnit, ostatní zůstanou původní)

5. Vygenerovat denní jídelníček (slova: "vygeneruj jídelníček", "plán na celý den", "co mám jíst dnes", "navrhni jídla na den"):
\`\`\`meal-plan
[{"slot":"snidane","name":"Ovesná kaše s banánem","grams":350,"kcal":380,"carbs":62,"protein":14,"fat":6},{"slot":"obed","name":"Kuřecí prsa s rýží","grams":450,"kcal":520,"carbs":55,"protein":48,"fat":10}]
\`\`\`
(použij sloty: snidane, dop_svacina, obed, odp_svacina, pred_tren, behem_tren, po_tren, vecere)
(celkové kcal musí odpovídat dennímu cíli uživatele; navrhni 4–6 jídel)

6. Navrhnout recept z ingrediencí (slova: "mám doma", "co uvařit z", "navrhni recept", "šéfkuchař"):
\`\`\`recipe-suggestion
{"name":"Kuřecí stir-fry s rýží","servings":2,"ingredients":[{"name":"Kuřecí prsa","grams":300},{"name":"Rýže","grams":200},{"name":"Brokolice","grams":150}],"macros":{"kcal":540,"carbs":62,"protein":48,"fat":8},"prep_time":"20 min","cycling_note":"Ideální regenerační jídlo po tréninku"}
\`\`\`

7. Zapsat jídlo/ingredience přímo do deníku (uživatel nadiktuje co snědl):
\`\`\`log-meal
{"slot":"obed","items":[{"name":"Kuřecí prsa","grams":200,"kcal":220,"carbs":0,"protein":46,"fat":4},{"name":"Rýže vařená","grams":150,"kcal":195,"carbs":43,"protein":4,"fat":0}]}
\`\`\`
(slot: snidane/dop_svacina/obed/odp_svacina/pred_tren/behem_tren/po_tren/vecere — zvol podle denní doby)
(odhadni makra z vlastní znalosti; pokud gramáž chybí, odhadni typickou porci)
(VŽDY použij tuto akci když uživatel říká "snědl jsem", "měl jsem k obědu", "zapiš mi", "nadiktuju ti", "loguj mi" + seznam jídel/ingrediencí)`;

export function useChatSession(ctx: AppCtx, tp?: TPContext) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory());
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => { saveHistory(messages); }, [messages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const markActionApplied = useCallback((messageId: string) => {
    setMessages(prev => prev.map(message =>
      message.id === messageId ? { ...message, actionApplied: true } : message
    ));
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
      const localKey = localStorage.getItem('anthropic_api_key');
      const remoteKey = localKey ? null : await getSetting<string>(ctx.userId, 'anthropic_api_key');
      const key = localKey || remoteKey || (import.meta.env.VITE_ANTHROPIC_API_KEY as string);
      if (!key) throw new Error('Vlož Anthropic API klíč v Nastavení → AI Poradce');
      if (!localKey && remoteKey) localStorage.setItem('anthropic_api_key', remoteKey);

      const haikuPromise = MEAL_RE.test(t) ? extractMealsViaHaiku(t, key) : Promise.resolve(undefined);

      const history = updated.slice(-20).map(m => ({
        role:    m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

      let fullText = '';

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':            'application/json',
          'x-api-key':               key,
          'anthropic-version':       '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-6',
          max_tokens: 1024,
          stream:     true,
          system: SYSTEM_PROMPT + `\n\nAktuální data uživatele:\n${buildContext(ctx, tp)}`,
          messages: history,
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(e.error?.message ?? `Chyba ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const ev = JSON.parse(json) as { type: string; delta?: { type: string; text: string } };
            if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
              fullText += ev.delta.text;
              setMessages(prev => prev.map(m => m.id === modelId ? { ...m, content: fullText } : m));
            }
          } catch { /* skip malformed SSE */ }
        }
      }

      // Parse action blocks
      let foodAction:     ChatMessage['foodAction'];
      let diaryAction:    ChatMessage['diaryAction'];
      let goalsAction:    ChatMessage['goalsAction'];
      let mealPlanAction: ChatMessage['mealPlanAction'];
      let recipeAction:   ChatMessage['recipeAction'];
      let logMealAction:  ChatMessage['logMealAction'];

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

      const goalsMatch = GOALS_RE.exec(fullText);
      if (goalsMatch) {
        try {
          const p = JSON.parse(goalsMatch[1]) as GoalsAction;
          goalsAction = {
            kcal:    p.kcal    ? Number(p.kcal)    : undefined,
            carbs:   p.carbs   ? Number(p.carbs)   : undefined,
            protein: p.protein ? Number(p.protein) : undefined,
            fat:     p.fat     ? Number(p.fat)     : undefined,
            water:   p.water   ? Number(p.water)   : undefined,
          };
          fullText = fullText.replace(GOALS_RE, '').trim();
        } catch { /* skip */ }
      }

      const mealPlanMatch = MEAL_PLAN_RE.exec(fullText);
      if (mealPlanMatch) {
        try {
          mealPlanAction = JSON.parse(mealPlanMatch[1]) as MealPlanItem[];
          fullText = fullText.replace(MEAL_PLAN_RE, '').trim();
        } catch { /* skip */ }
      }

      const recipeMatch = RECIPE_RE.exec(fullText);
      if (recipeMatch) {
        try {
          recipeAction = JSON.parse(recipeMatch[1]) as RecipeSuggestionAction;
          fullText = fullText.replace(RECIPE_RE, '').trim();
        } catch { /* skip */ }
      }

      const logMealMatch = LOG_MEAL_RE.exec(fullText);
      if (logMealMatch) {
        try {
          logMealAction = JSON.parse(logMealMatch[1]) as LogMealAction;
          fullText = fullText.replace(LOG_MEAL_RE, '').trim();
        } catch { /* skip */ }
      }

      if (!logMealAction && !foodAction && !mealPlanAction) {
        const haiku = await haikuPromise;
        if (haiku) logMealAction = haiku;
      }

      setMessages(prev =>
        prev.map(m => m.id === modelId
          ? { ...m, content: fullText, foodAction, diaryAction, goalsAction, mealPlanAction, recipeAction, logMealAction }
          : m)
      );
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== modelId));
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, ctx]);

  return { messages, input, setInput, loading, error, send, clearHistory, markActionApplied };
}
