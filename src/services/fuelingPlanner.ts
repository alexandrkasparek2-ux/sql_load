import type { PlannedWorkout } from './trainingPeaksService';

export type WorkoutFuelType =
  | 'rest' | 'recovery' | 'easy_endurance' | 'endurance'
  | 'tempo' | 'sweet_spot' | 'threshold' | 'vo2'
  | 'long_ride' | 'race' | 'strength' | 'unknown';

export interface FuelingTargets {
  workoutType:          WorkoutFuelType;
  carbsPerHourMin:      number;
  carbsPerHourMax:      number;
  totalCarbsDuring:     number;
  fluidsPerHourMl:      number;
  totalFluidsMl:        number;
  sodiumPerHourMg:      number;
  totalSodiumMg:        number;
  preWorkoutCarbs:      number;
  preWorkoutProtein:    number;
  postWorkoutCarbs:     number;
  postWorkoutProtein:   number;
  estimatedDurationMin: number;
  recommendationText:   string;
  warnings:             string[];
}

export interface FuelingChecklistItem {
  icon:     string;
  label:    string;
  detail:   string;
  category: 'bottle' | 'gel' | 'bar' | 'food' | 'electrolyte' | 'recovery';
}

export const FUEL_TYPE_META: Record<WorkoutFuelType, { label: string; color: string; icon: string }> = {
  rest:           { label: 'Odpočinek',      color: '#64748b', icon: '🛌' },
  recovery:       { label: 'Regenerace',     color: '#22c55e', icon: '🌱' },
  easy_endurance: { label: 'Easy endurance', color: '#22c55e', icon: '🚴' },
  endurance:      { label: 'Vytrvalost',     color: '#06b6d4', icon: '🚴' },
  tempo:          { label: 'Tempo',          color: '#f59e0b', icon: '⚡' },
  sweet_spot:     { label: 'Sweet Spot',     color: '#f97316', icon: '🎯' },
  threshold:      { label: 'Threshold',      color: '#ef4444', icon: '🔥' },
  vo2:            { label: 'VO2max',         color: '#a855f7', icon: '🫁' },
  long_ride:      { label: 'Dlouhá jízda',   color: '#8b5cf6', icon: '🛣️' },
  race:           { label: 'Závod',          color: '#fbbf24', icon: '🏁' },
  strength:       { label: 'Silový',         color: '#f97316', icon: '💪' },
  unknown:        { label: 'Trénink',        color: '#6b7280', icon: '🏅' },
};

const DEFAULT_DURATION: Record<WorkoutFuelType, number> = {
  rest: 0, recovery: 45, easy_endurance: 75, endurance: 90,
  tempo: 120, sweet_spot: 120, threshold: 120, vo2: 75,
  long_ride: 240, race: 300, strength: 60, unknown: 90,
};

function has(text: string, ...terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some(t => lower.includes(t.toLowerCase()));
}

export function classifyWorkout(workout: PlannedWorkout | null): WorkoutFuelType {
  if (!workout) return 'rest';
  const text = `${workout.title} ${workout.description}`;
  const { sportType, durationMin, tss } = workout;

  if (sportType === 'strength' || has(text, 'strength', 'gym', 'posilovna', 'silový', 'crossfit')) return 'strength';
  if (has(text, 'race', 'závod', 'road classics', 'gran fondo race')) return 'race';
  if (durationMin >= 180 || tss >= 180 || has(text, 'long ride', 'gran fondo', 'marathon')) return 'long_ride';
  if (has(text, 'vo2', 'vo2max', '110%', '120%', 'over-under')) return 'vo2';
  if (has(text, 'threshold', 'ftp test', 'prah', '95%', '100%', 'lactate')) return 'threshold';
  if (has(text, 'sweet spot', 'sweetspot', 'ss/', ' ss ', '85%', '88%', '90%')) return 'sweet_spot';
  if (has(text, 'tempo', 'z3', '76%', '80%', 'zone 3')) return 'tempo';
  if (has(text, 'recovery', 'easy', 'regenerační', 'regenerace', 'z1', 'zone 1', 'volno')) return 'recovery';
  if (durationMin > 0 && durationMin < 60) return 'recovery';
  if (tss > 0 && tss < 40) return 'recovery';
  if (has(text, 'endurance', 'z2', 'zone 2', 'vytrvalost', 'base') || (durationMin >= 60 && durationMin < 180)) return 'endurance';
  if (sportType !== 'rest') return 'unknown';
  return 'rest';
}

interface TypeSpec {
  carbsMin: number; carbsMax: number;
  fluidsMin: number; fluidsMax: number;
  sodiumMin: number; sodiumMax: number;
  preCarbs: number; preProtein: number;
  postCarbs: number; postProtein: number;
  rec: string;
}

const TYPE_SPECS: Record<WorkoutFuelType, TypeSpec> = {
  rest: {
    carbsMin: 0, carbsMax: 0, fluidsMin: 0, fluidsMax: 0, sodiumMin: 0, sodiumMax: 0,
    preCarbs: 0, preProtein: 0, postCarbs: 0, postProtein: 0,
    rec: 'Odpočinkový den. Normální strava, zaměř se na hydrataci.',
  },
  recovery: {
    carbsMin: 0, carbsMax: 20, fluidsMin: 300, fluidsMax: 500, sodiumMin: 300, sodiumMax: 500,
    preCarbs: 30, preProtein: 10, postCarbs: 40, postProtein: 25,
    rec: 'Lehká regenerační session. Hydratace důležitější než fueling.',
  },
  easy_endurance: {
    carbsMin: 20, carbsMax: 40, fluidsMin: 400, fluidsMax: 600, sodiumMin: 400, sodiumMax: 600,
    preCarbs: 50, preProtein: 10, postCarbs: 60, postProtein: 30,
    rec: 'Easy endurance. Základní fueling, priorita hydratace a elektrolyty.',
  },
  endurance: {
    carbsMin: 30, carbsMax: 45, fluidsMin: 500, fluidsMax: 650, sodiumMin: 400, sodiumMax: 700,
    preCarbs: 70, preProtein: 15, postCarbs: 70, postProtein: 35,
    rec: 'Vytrvalostní trénink. Doplňuj sacharidy každých 30 min, sleduj hydrataci.',
  },
  tempo: {
    carbsMin: 60, carbsMax: 75, fluidsMin: 500, fluidsMax: 750, sodiumMin: 500, sodiumMax: 800,
    preCarbs: 100, preProtein: 20, postCarbs: 90, postProtein: 35,
    rec: 'Tempo trénink. Sacharidy jsou klíčové pro udržení intenzity — začni jíst brzy.',
  },
  sweet_spot: {
    carbsMin: 60, carbsMax: 75, fluidsMin: 500, fluidsMax: 750, sodiumMin: 500, sodiumMax: 800,
    preCarbs: 110, preProtein: 20, postCarbs: 90, postProtein: 35,
    rec: 'Sweet Spot. Agresivní fueling nutný — začni s gelem po 30 min, pak každých 30 min.',
  },
  threshold: {
    carbsMin: 60, carbsMax: 75, fluidsMin: 500, fluidsMax: 750, sodiumMin: 500, sodiumMax: 800,
    preCarbs: 120, preProtein: 20, postCarbs: 100, postProtein: 40,
    rec: 'Prahový trénink. Plné glykogenové zásoby jsou podmínkou — carb-load den před.',
  },
  vo2: {
    carbsMin: 45, carbsMax: 70, fluidsMin: 500, fluidsMax: 750, sodiumMin: 500, sodiumMax: 800,
    preCarbs: 110, preProtein: 15, postCarbs: 90, postProtein: 40,
    rec: 'VO2max session. Kratší a velmi intenzivní — sacharidy před, agresivní regenerace po.',
  },
  long_ride: {
    carbsMin: 70, carbsMax: 90, fluidsMin: 600, fluidsMax: 900, sodiumMin: 600, sodiumMax: 1000,
    preCarbs: 150, preProtein: 20, postCarbs: 130, postProtein: 40,
    rec: 'Dlouhá jízda 3h+. Carb-load večer před, 500 ml každých 30 min, střídej gely a tyčinky.',
  },
  race: {
    carbsMin: 80, carbsMax: 100, fluidsMin: 600, fluidsMax: 900, sodiumMin: 700, sodiumMax: 1100,
    preCarbs: 180, preProtein: 20, postCarbs: 150, postProtein: 40,
    rec: 'Závodní den. Carb plan nachystaný dopředu, žádné improvizování v sedle.',
  },
  strength: {
    carbsMin: 0, carbsMax: 15, fluidsMin: 400, fluidsMax: 600, sodiumMin: 300, sodiumMax: 500,
    preCarbs: 50, preProtein: 20, postCarbs: 40, postProtein: 35,
    rec: 'Silový trénink. Sacharidy před pro energii, bílkoviny do 30 min po výkonu.',
  },
  unknown: {
    carbsMin: 30, carbsMax: 60, fluidsMin: 500, fluidsMax: 700, sodiumMin: 400, sodiumMax: 700,
    preCarbs: 70, preProtein: 15, postCarbs: 70, postProtein: 30,
    rec: 'Standardní fueling — předzásoby sacharidů, hydratace, regenerace po.',
  },
};

export function calculateFuelingTargets(workout: PlannedWorkout, type: WorkoutFuelType): FuelingTargets {
  const dur = workout.durationMin > 0 ? workout.durationMin : DEFAULT_DURATION[type];
  const durH = dur / 60;
  const s = TYPE_SPECS[type];

  const carbsMid = (s.carbsMin + s.carbsMax) / 2;
  const fluidsMid = (s.fluidsMin + s.fluidsMax) / 2;
  const sodiumMid = (s.sodiumMin + s.sodiumMax) / 2;

  const warnings: string[] = [];
  if (!workout.durationMin) warnings.push('Délka tréninku není zadána — délka odhadnuta automaticky.');
  if (!workout.tss && type !== 'rest' && type !== 'strength') warnings.push('TSS není dostupné v plánu.');

  return {
    workoutType: type,
    carbsPerHourMin: s.carbsMin,
    carbsPerHourMax: s.carbsMax,
    totalCarbsDuring: Math.round(carbsMid * durH),
    fluidsPerHourMl: Math.round(fluidsMid),
    totalFluidsMl: Math.round(fluidsMid * durH),
    sodiumPerHourMg: Math.round(sodiumMid),
    totalSodiumMg: Math.round(sodiumMid * durH),
    preWorkoutCarbs: s.preCarbs,
    preWorkoutProtein: s.preProtein,
    postWorkoutCarbs: s.postCarbs,
    postWorkoutProtein: s.postProtein,
    estimatedDurationMin: dur,
    recommendationText: s.rec,
    warnings,
  };
}

export function buildFuelingChecklist(targets: FuelingTargets): FuelingChecklistItem[] {
  if (targets.workoutType === 'rest') return [];

  const items: FuelingChecklistItem[] = [];
  const durH = targets.estimatedDurationMin / 60;

  // Bottles
  if (targets.fluidsPerHourMl > 0) {
    const bottles = Math.max(1, Math.ceil(targets.totalFluidsMl / 600));
    items.push({
      icon: '🚰',
      label: `${bottles} láh${bottles === 1 ? 'ev' : bottles < 5 ? 've' : 'ví'}`,
      detail: `${targets.fluidsPerHourMl} ml/h · celkem ${targets.totalFluidsMl} ml`,
      category: 'bottle',
    });
  }

  // Gels / bars
  const totalCarbs = targets.totalCarbsDuring;
  if (totalCarbs > 0 && durH >= 0.75) {
    if (totalCarbs <= 50) {
      const gels = Math.max(1, Math.round(totalCarbs / 25));
      items.push({ icon: '🍬', label: `${gels} gel`, detail: `${totalCarbs} g sacharidů celkem`, category: 'gel' });
    } else if (totalCarbs <= 120) {
      const gels = Math.round(totalCarbs / 25 * 0.6);
      const bars = Math.round((totalCarbs - gels * 25) / 40);
      if (gels > 0) items.push({ icon: '🍬', label: `${gels} gel${gels > 1 ? 'y' : ''}`, detail: '25 g sacharidů / gel', category: 'gel' });
      if (bars > 0) items.push({ icon: '🍫', label: `${bars} tyčink${bars === 1 ? 'a' : 'y'}`, detail: '40 g sacharidů / tyčinka', category: 'bar' });
    } else {
      const gels = Math.round(totalCarbs / 25 * 0.5);
      const bars = Math.round(totalCarbs / 40 * 0.3);
      items.push({ icon: '🍬', label: `${gels} gely`, detail: '25 g sacharidů / gel', category: 'gel' });
      items.push({ icon: '🍫', label: `${bars} tyčinky`, detail: '40 g sacharidů / tyčinka', category: 'bar' });
      items.push({ icon: '🍚', label: '1–2 rýžové koláče', detail: '35–45 g sacharidů / kus', category: 'food' });
    }
  }

  // Electrolytes
  if (targets.sodiumPerHourMg > 0) {
    items.push({
      icon: '⚡',
      label: 'Elektrolyty',
      detail: `${targets.sodiumPerHourMg} mg Na/h · celkem ${targets.totalSodiumMg} mg`,
      category: 'electrolyte',
    });
  }

  // Post-workout recovery
  if (targets.postWorkoutProtein > 0) {
    items.push({
      icon: '🥩',
      label: 'Regenerace po tréninku',
      detail: `${targets.postWorkoutProtein} g bílkovin + ${targets.postWorkoutCarbs} g sacharidů do 30 min`,
      category: 'recovery',
    });
  }

  return items;
}

export function comparePlannedVsActual(
  planned: PlannedWorkout | null,
  actualTSS: number,
  actualDurationMin: number,
): string | null {
  if (!planned) return null;
  const planDur = planned.durationMin || 0;
  const planTSS = planned.tss || 0;

  const durationDiff = actualDurationMin - planDur;
  const tssDiff = planTSS > 0 ? actualTSS - planTSS : 0;

  const messages: string[] = [];

  if (tssDiff > planTSS * 0.25 || durationDiff > 30) {
    messages.push('Výkon byl výrazně vyšší než plán. Na večeři přidej 80–120 g sacharidů navíc pro doplnění glykogenu.');
  }
  if (tssDiff < -planTSS * 0.25) {
    messages.push('Výkon byl nižší než plán — potřeby kalorií a sacharidů jsou dnes menší.');
  }

  return messages.length > 0 ? messages.join(' ') : null;
}
