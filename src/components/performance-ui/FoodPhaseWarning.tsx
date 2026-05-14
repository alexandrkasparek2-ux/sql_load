// ============================================================
// FoodPhaseWarning.tsx
// Skenování food logu — varování nevhodných potravin dle fáze.
// Carb-loading: vláknina, alkohol → ❌
// Race day ráno: tučné maso, smažené → ⚠️
// Build: prázdné kalorie → ⚠️
// ============================================================

import type { TrainingPhase } from '../../services/phaseDetectionService';

interface FoodEntry {
  food_name: string;
  food_id?:  string;
  meal_slot?: string;
  kcal:      number;
}

interface PhaseWarning {
  food:     string;
  level:    'error' | 'warning';
  message:  string;
}

// Klíčová slova nevhodných potravin dle fáze
const FORBIDDEN_KEYWORDS: Record<TrainingPhase, { kw: string[]; level: 'error' | 'warning'; msg: string }[]> = {
  off_season: [],
  build_1: [
    { kw: ['alkohol', 'pivo', 'víno', 'lihoviny', 'whiskey', 'vodka'], level: 'warning', msg: 'Alkohol zpomaluje svalovou regeneraci.' },
    { kw: ['hranolky', 'chipsy', 'sladkosti', 'fast food', 'hamburger'], level: 'warning', msg: 'Prázdné kalorie — nevyhovuje nutričním potřebám BUILD fáze.' },
  ],
  build_2: [
    { kw: ['alkohol', 'pivo', 'víno', 'lihoviny'], level: 'error', msg: 'Alkohol v intenzivní BUILD fázi výrazně snižuje výkon a regeneraci.' },
    { kw: ['hranolky', 'chipsy', 'fast food'], level: 'warning', msg: 'Prázdné kalorie — nahraď sacharidy kvalitní zdrojů.' },
  ],
  pre_race: [
    { kw: ['alkohol', 'pivo', 'víno'], level: 'error', msg: 'Alkohol před závodem — zakázáno!' },
    { kw: ['tučné', 'smažené', 'fritované', 'slanina'], level: 'warning', msg: 'Tučná jídla zpomalují vstřebávání sacharidů.' },
  ],
  race_week: [
    { kw: ['brokolice', 'zelí', 'kapusta', 'fazole', 'čočka', 'hrách', 'cizrna'], level: 'error', msg: 'Vláknina/luštěniny — zakázáno v carb-loading fázi! Riziko GI potíží.' },
    { kw: ['alkohol', 'pivo', 'víno', 'lihoviny'], level: 'error', msg: 'Alkohol zakázán v závodním týdnu!' },
    { kw: ['smažené', 'fritované', 'hranolky'], level: 'error', msg: 'Smažená jídla — zakázáno v závodním týdnu!' },
    { kw: ['syrová zelenina', 'špenát raw', 'salát raw'], level: 'warning', msg: 'Syrová zelenina — vláknina a GI riziko. Preferuj vařenou zeleninu.' },
  ],
  race_day: [
    { kw: ['vepřové', 'bůček', 'slanina', 'smažené', 'fritované'], level: 'error', msg: 'Tučné/smažené před závodem — GI katastrofa!' },
    { kw: ['luštěniny', 'fazole', 'čočka', 'hrách'], level: 'error', msg: 'Luštěniny v závodní den — velké riziko žaludečních potíží.' },
    { kw: ['alkohol'], level: 'error', msg: 'Alkohol v závodní den — absolutní zákaz!' },
    { kw: ['brokolice', 'zelí', 'kapusta'], level: 'warning', msg: 'Vláknina před závodem — může způsobit GI potíže.' },
    { kw: ['nové jídlo', 'neznámé'], level: 'warning', msg: 'Neznámé jídlo v závodní den — nikdy nezkoušej nic nového!' },
  ],
  post_race: [],
};

// ID zakázaných potravin ze systémové databáze
const FORBIDDEN_IDS: Partial<Record<TrainingPhase, string[]>> = {
  race_week: ['broccoli', 'cabbage', 'kidney_beans', 'chickpeas', 'lentils', 'beer', 'wine', 'spirits'],
  race_day:  ['pork_belly', 'bacon', 'fried_chicken', 'french_fries', 'beer', 'wine', 'spirits',
              'broccoli', 'kidney_beans', 'chickpeas'],
};

function detectWarnings(entries: FoodEntry[], phase: TrainingPhase): PhaseWarning[] {
  const rules     = FORBIDDEN_KEYWORDS[phase] ?? [];
  const forbIds   = FORBIDDEN_IDS[phase] ?? [];
  const warnings: PhaseWarning[] = [];

  for (const entry of entries) {
    const name = entry.food_name.toLowerCase();
    const id   = (entry.food_id ?? '').toLowerCase();

    // Kontrola dle ID ze systémové databáze
    if (forbIds.some(fid => id.includes(fid))) {
      warnings.push({
        food: entry.food_name, level: 'error',
        message: 'Tato potravina je v aktuální fázi zakázána.',
      });
      continue;
    }

    // Kontrola dle klíčových slov v názvu
    for (const rule of rules) {
      if (rule.kw.some(kw => name.includes(kw))) {
        warnings.push({ food: entry.food_name, level: rule.level, message: rule.msg });
        break;
      }
    }
  }

  // Deduplikuj stejné potraviny
  return warnings.filter((w, i, arr) => arr.findIndex(x => x.food === w.food) === i);
}

interface Props {
  entries: FoodEntry[];
  phase:   TrainingPhase;
}

export function FoodPhaseWarning({ entries, phase }: Props) {
  const warnings = detectWarnings(entries, phase);
  if (warnings.length === 0) return null;

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 14 }}>
      <div className="label-caps" style={{ color: '#f59e0b', marginBottom: 10 }}>
        ⚠️ Varování výživy — {phase.replace('_', ' ')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {warnings.map((w, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            background: w.level === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            borderRadius: 10, padding: '10px 12px',
            border: `1px solid ${w.level === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>
              {w.level === 'error' ? '❌' : '⚠️'}
            </span>
            <div>
              <div style={{
                color: w.level === 'error' ? '#ef4444' : '#f59e0b',
                fontSize: 13, fontWeight: 700, marginBottom: 2,
              }}>
                {w.food}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                {w.message}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FoodPhaseWarning;
