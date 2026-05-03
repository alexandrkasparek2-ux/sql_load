import type { TrainingType } from '../constants/training';

export function getDuringCarbRange(
  primaryTraining: TrainingType,
  totalHours: number,
): { min: number; max: number } {
  if (totalHours < 0.75) return { min: 0, max: 25 };
  switch (primaryTraining) {
    case 'race':           return { min: 85, max: 100 };
    case 'hard':           return { min: 70, max: 90 };
    case 'medium':
    case 'cycling_indoor': return { min: 50, max: 70 };
    case 'running':        return { min: 40, max: 60 };
    case 'light':
    case 'hiking':         return { min: 30, max: 45 };
    case 'strength':       return { min: 0,  max: 20 };
    default:               return { min: 25, max: 45 };
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function calcFuelingScore(input: {
  totals:              { carbs: number; protein: number };
  goals:               { carbs: number; protein: number; water: number };
  waterGlasses:        number;
  totalHours:          number;
  duringCarbs:         number;
  carbRange:           { min: number; max: number };
  postWorkoutProtein:  number;
}): number {
  const proteinScore   = clamp((input.totals.protein / Math.max(input.goals.protein, 1)) * 25, 0, 25);
  const carbScore      = clamp((input.totals.carbs   / Math.max(input.goals.carbs,   1)) * 25, 0, 25);
  const waterGoalGlasses = Math.max(1, Math.round(input.goals.water * 4));
  const hydrationScore = clamp((input.waterGlasses / waterGoalGlasses) * 20, 0, 20);
  const duringScore    = input.totalHours >= 1.2
    ? clamp((input.duringCarbs / Math.max(input.carbRange.min * input.totalHours, 1)) * 20, 0, 20)
    : 20;
  const postScore      = input.totalHours >= 1.2
    ? clamp((input.postWorkoutProtein / 25) * 10, 0, 10)
    : 10;
  return Math.round(proteinScore + carbScore + hydrationScore + duringScore + postScore);
}
