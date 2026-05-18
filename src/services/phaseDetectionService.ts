// ============================================================
// phaseDetectionService.ts
// Detekce tréninkové fáze na základě data závodu a aktuálního data.
// Fáze určuje výživové cíle, suplementaci a doporučení pro celý den.
// ============================================================

export type TrainingPhase =
  | 'off_season'   // >16 týdnů před závodem nebo >2 týdny po
  | 'build_1'      // 8–16 týdnů před závodem (objem)
  | 'build_2'      // 4–8 týdnů před závodem (intenzita)
  | 'pre_race'     // 4–8 týdnů před závodem (threshold + VO2)
  | 'race_week'    // 1–7 dní před závodem
  | 'race_day'     // Den závodu
  | 'post_race'    // 0–14 dní po závodě
  | 'rest_day';    // Manuální den regenerace (bez tréninku)

export interface PhaseInfo {
  phase: TrainingPhase;
  label: string;
  color: string;
  icon: string;
  daysToRace: number | null;
  daysSinceRace: number | null;
  tip: string;
}

// Barvy fází dle designového systému CycloFuel
export const PHASE_COLORS: Record<TrainingPhase, string> = {
  off_season: '#9E9E9E',
  build_1:    '#2196F3',
  build_2:    '#9C27B0',
  pre_race:   '#FF9800',
  race_week:  '#F44336',
  race_day:   '#4CAF50',
  post_race:  '#009688',
  rest_day:   '#607D8B',
};

export const PHASE_LABELS: Record<TrainingPhase, string> = {
  off_season: 'Off Season',
  build_1:    'Build 1 — Objem',
  build_2:    'Build 2 — Intenzita',
  pre_race:   'Pre Race',
  race_week:  'Race Week',
  race_day:   'Race Day 🏁',
  post_race:  'Post Race',
  rest_day:   'Den regenerace',
};

export const PHASE_ICONS: Record<TrainingPhase, string> = {
  off_season: '🛌',
  build_1:    '🚴',
  build_2:    '⚡',
  pre_race:   '🎯',
  race_week:  '🔥',
  race_day:   '🏁',
  post_race:  '🌱',
  rest_day:   '😴',
};

export const PHASE_TIPS: Record<TrainingPhase, string> = {
  off_season: 'Zaměř se na složení těla a základní kondici.',
  build_1:    'Buduj aerobní základ — vysoký objem, nízká intenzita.',
  build_2:    'Zvyš intenzitu, periodizuj sacharidy dle TSS dne.',
  pre_race:   'Threshold a VO2max — maximální příjem sacharidů.',
  race_week:  'Tapering + carb-loading — připrav glykogenové zásoby.',
  race_day:   'Den závodu — drž se protokolu, žádné improvizace.',
  post_race:  'Regenerace — protein a sacharidy pro obnovu svalů.',
  rest_day:   'Nulový trénink — zaměř se na protein a spánek.',
};

// Počet dní mezi dvěma daty (kladné = toDate je po fromDate)
export function differenceInDays(toDate: Date, fromDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  // Normalizace na půlnoc lokálního času pro přesné výsledky
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const to   = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

// Hlavní funkce detekce fáze
export function detectPhase(
  today: Date,
  nextRace: Date | null,
  lastRace: Date | null,
): TrainingPhase {
  if (!nextRace && !lastRace) return 'off_season';

  const daysToRace    = nextRace ? differenceInDays(nextRace, today) : null;
  const daysSinceRace = lastRace ? differenceInDays(today, lastRace) : null;

  // Post-race má přednost — regenerace trvá max 14 dní
  if (daysSinceRace !== null && daysSinceRace >= 0 && daysSinceRace <= 14) {
    return 'post_race';
  }

  if (daysToRace === null) return 'off_season';
  if (daysToRace < 0) return 'off_season'; // závod je v minulosti a >14 dní
  if (daysToRace === 0) return 'race_day';
  if (daysToRace <= 7)  return 'race_week';
  if (daysToRace <= 28) return 'pre_race';
  if (daysToRace <= 56) return 'build_2';
  if (daysToRace <= 112) return 'build_1';

  return 'off_season';
}

// Sestaví úplné PhaseInfo pro UI
export function getPhaseInfo(
  today: Date,
  nextRace: Date | null,
  lastRace: Date | null,
): PhaseInfo {
  const phase         = detectPhase(today, nextRace, lastRace);
  const daysToRace    = nextRace ? differenceInDays(nextRace, today) : null;
  const daysSinceRace = lastRace ? differenceInDays(today, lastRace) : null;

  return {
    phase,
    label:         PHASE_LABELS[phase],
    color:         PHASE_COLORS[phase],
    icon:          PHASE_ICONS[phase],
    daysToRace,
    daysSinceRace,
    tip:           PHASE_TIPS[phase],
  };
}

// Race event uložený v Supabase
export interface RaceEvent {
  id:                       string;
  user_id:                  string;
  name:                     string;
  race_date:                string; // ISO DATE yyyy-mm-dd
  distance_km:              number | null;
  elevation_m:              number | null;
  estimated_duration_hours: number | null;
  race_type:                'A' | 'B' | 'C'; // A = hlavní závod, B = vedlejší, C = tréninkový
}
