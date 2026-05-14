// ============================================================
// useDailyNutritionTarget.ts
// Hook pro výpočet denního nutričního cíle dle fáze, TSS, Garmin kJ
// a profilu uživatele. Automaticky se přepočítá při změně vstupu.
// ============================================================

import { useMemo } from 'react';
import type { TrainingPhase, PhaseInfo } from '../services/phaseDetectionService';
import {
  calculateBMR,
  calculateDailyTarget,
  calculateCarbLoadingTarget,
  type DailyNutritionTarget,
} from '../services/nutritionTargetService';
import type { Profile } from './useProfile';

interface UseDailyNutritionTargetInput {
  profile:        Profile | null;
  phaseInfo:      PhaseInfo | null;
  tss:            number;      // TSS dne z Garminu nebo Intervals.icu
  garminKj:       number | null; // kJ výdej z Garminu
  caloricDeficit: number;      // 0 až -300 (jen off_season)
  // Příznak carb-loading (3–2 dny před závodem)
  isCarbLoading?: boolean;
}

interface UseDailyNutritionTargetResult {
  target:  DailyNutritionTarget | null;
  bmr:     number;
  loading: boolean;
}

export function useDailyNutritionTarget({
  profile,
  phaseInfo,
  tss,
  garminKj,
  caloricDeficit,
  isCarbLoading = false,
}: UseDailyNutritionTargetInput): UseDailyNutritionTargetResult {
  const bmr = useMemo(() => {
    if (!profile) return 0;
    return calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
  }, [profile]);

  const target = useMemo((): DailyNutritionTarget | null => {
    if (!profile || !phaseInfo || bmr === 0) return null;

    const phase: TrainingPhase = phaseInfo.phase;

    // Carb-loading má speciální výpočet (3–2 dny před závodem)
    if (isCarbLoading || (phase === 'race_week' && phaseInfo.daysToRace != null
      && phaseInfo.daysToRace >= 1 && phaseInfo.daysToRace <= 2)) {
      return calculateCarbLoadingTarget(profile.weight, bmr);
    }

    return calculateDailyTarget(phase, profile.weight, bmr, tss, garminKj, caloricDeficit);
  }, [profile, phaseInfo, bmr, tss, garminKj, caloricDeficit, isCarbLoading]);

  return { target, bmr, loading: false };
}
