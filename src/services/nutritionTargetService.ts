// ============================================================
// nutritionTargetService.ts
// Výpočet denních kalorických a makro cílů dle tréninkové fáze,
// TSS dne, tréninkového výdeje a profilu uživatele.
// ============================================================

import type { TrainingPhase } from './phaseDetectionService';

// ── BMR (Harris-Benedict) ──────────────────────────────────
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female',
): number {
  if (gender === 'male') {
    return Math.round(88.36 + 13.4 * weightKg + 4.8 * heightCm - 5.7 * age);
  }
  return Math.round(447.6 + 9.25 * weightKg + 3.1 * heightCm - 4.33 * age);
}

// ── Tréninkový výdej ──────────────────────────────────────
// Primárně: Garmin kJ ≈ kcal (korekce 1.0)
// Fallback: TSS × 0.85 × (váha / 75)
export function estimateTrainingKcal(
  tss: number,
  weightKg: number,
  garminKj?: number | null,
): number {
  if (garminKj && garminKj > 0) return Math.round(garminKj);
  if (tss > 0) return Math.round(tss * 0.85 * (weightKg / 75));
  return 0;
}

// MET values per training type and intensity (kcal/hr ≈ MET × kg × 1.05)
const MET_TABLE: Record<string, { low: number; medium: number; high: number }> = {
  hard:           { low: 8,  medium: 12, high: 16 },
  race:           { low: 10, medium: 14, high: 18 },
  medium:         { low: 6,  medium: 9,  high: 12 },
  light:          { low: 4,  medium: 7,  high: 9  },
  cycling_indoor: { low: 5,  medium: 8,  high: 11 },
  running:        { low: 7,  medium: 9,  high: 12 },
  swimming:       { low: 5,  medium: 7,  high: 10 },
  strength:       { low: 3,  medium: 5,  high: 7  },
  walking:        { low: 2,  medium: 3,  high: 5  },
  hiking:         { low: 4,  medium: 6,  high: 8  },
  yoga:           { low: 2,  medium: 3,  high: 4  },
  skiing:         { low: 5,  medium: 7,  high: 10 },
  team_sport:     { low: 4,  medium: 6,  high: 9  },
  dancing:        { low: 3,  medium: 5,  high: 7  },
  boxing:         { low: 6,  medium: 9,  high: 12 },
};

// ── Odhad výdeje z ručně zadaných tréninkových hodin ─────
// Použije se jako fallback, když nejsou dostupná data z Intervals.icu/Garminu.
export function estimateKcalFromTrainingDay(
  trainingType: string,
  rideHours: number,
  activityHours: Record<string, number>,
  activityIntensity: Record<string, 'low' | 'medium' | 'high'>,
  weightKg: number,
): number {
  if (weightKg <= 0) return 0;
  let total = 0;

  // Primární cyklistický výkon (ride_hours) — intensity defaultně 'medium'
  if (rideHours > 0 && trainingType !== 'rest') {
    const mets = MET_TABLE[trainingType] ?? MET_TABLE['medium'];
    total += mets.medium * weightKg * 1.05 * rideHours;
  }

  // Doplňkové aktivity s jejich intenzitou
  for (const [type, hours] of Object.entries(activityHours)) {
    if (!hours || hours <= 0) continue;
    const intensity = activityIntensity[type] ?? 'medium';
    const mets = MET_TABLE[type] ?? { low: 4, medium: 7, high: 10 };
    total += mets[intensity] * weightKg * 1.05 * hours;
  }

  return Math.round(total);
}

// ── Periodizace sacharidů dle TSS (BUILD fáze) ─────────────
export function carbsPerKgByTSS(tss: number): { min: number; max: number } {
  if (tss < 50)  return { min: 4, max: 5 };
  if (tss < 100) return { min: 5, max: 6 };
  if (tss < 200) return { min: 6, max: 8 };
  return { min: 8, max: 10 }; // TSS 200+ = závodní simulace
}

// ── Hlavní interface výstupu ──────────────────────────────
export interface DailyNutritionTarget {
  phase:              TrainingPhase;
  kcal:               number;
  carbs_g:            number;
  protein_g:          number;
  fat_g:              number;
  water_glasses:      number;
  notes:              string[];
  forbidden_foods:    string[];
  recommended_foods:  string[];
  supplements:        string[];
  // Timing doporučení pro BUILD fáze
  pre_workout_carbs?:  number;  // g sacharidů 2h před
  intra_workout_carbs?: number; // g sacharidů/h (pro >90 min)
  post_workout_protein?: number; // g proteinu do 30 min
  post_workout_carbs?:   number; // g sacharidů do 30 min
  // Upozornění
  warnings: string[];
}

// ── Výpočet denního cíle ──────────────────────────────────
export function calculateDailyTarget(
  phase: TrainingPhase,
  weightKg: number,
  bmr: number,
  tss: number,
  garminKj: number | null,
  caloricDeficit: number, // 0 až -300 kcal (jen off_season)
): DailyNutritionTarget {
  const trainingKcal = estimateTrainingKcal(tss, weightKg, garminKj);
  const warnings: string[] = [];

  switch (phase) {
    // ── OFF SEASON ───────────────────────────────────────
    case 'off_season': {
      const deficit = Math.max(-300, Math.min(0, caloricDeficit));
      const kcal = Math.round(bmr * 1.35 + deficit); // střed rozsahu 1.3–1.4
      const protein_g = Math.round(weightKg * 2.1);   // střed 2.0–2.2
      const carbs_g   = Math.round(weightKg * 3.5);   // střed 3–4
      const fat_g     = Math.round((kcal - carbs_g * 4 - protein_g * 4) / 9);
      if (deficit < -250) warnings.push('Deficit přes –250 kcal — sleduj svalovou hmotu!');
      return {
        phase, kcal, carbs_g, protein_g, fat_g: Math.max(fat_g, Math.round(weightKg * 0.8)),
        water_glasses: 8,
        notes: [
          'Priorita: složení těla → výkon → regenerace',
          'Alkohol povolen střídmě (1–2× týdně max)',
          'Vláknina: doporučeno 30+ g/den',
        ],
        forbidden_foods: [],
        recommended_foods: ['Libové maso', 'Vejce', 'Tvaroh', 'Celozrnné pečivo', 'Zelenina', 'Luštěniny'],
        supplements: ['Kreatin 3–5 g/den', 'Omega-3 2–3 g/den', 'Vitamín D 2000 IU/den', 'Hořčík 300–400 mg večer'],
        warnings,
      };
    }

    // ── BUILD 1 (objem) ──────────────────────────────────
    case 'build_1': {
      const { min, max } = carbsPerKgByTSS(tss);
      const carbsMidPerKg = (min + max) / 2;
      const kcal      = Math.round(bmr * 1.65 + trainingKcal); // střed 1.6–1.7
      const protein_g = Math.round(weightKg * 1.9);             // střed 1.8–2.0
      const carbs_g   = Math.round(weightKg * carbsMidPerKg);
      const fat_g     = Math.round(weightKg * 1.1);             // střed 1.0–1.2
      if (kcal < trainingKcal + bmr) warnings.push('Příjem pod úrovní výdeje — žádný deficit v BUILD fázi!');
      return {
        phase, kcal, carbs_g, protein_g, fat_g,
        water_glasses: 10,
        notes: [
          'Priorita: výkon → regenerace → složení těla',
          'Žádný kalorický deficit!',
          `TSS ${tss}: ${min}–${max} g/kg sacharidů dnes`,
        ],
        forbidden_foods: ['Alkohol ve velkém množství', 'Prázdné kalorie'],
        recommended_foods: ['Těstoviny', 'Rýže', 'Ovesné vločky', 'Kuřecí maso', 'Losos', 'Banány', 'Batáty'],
        supplements: ['Kreatin 3–5 g/den', 'Hořčík 400 mg večer', 'Vitamín C 500 mg/den', 'Beta-alanin 3.2 g/den', 'Ashwagandha 600 mg večer'],
        pre_workout_carbs:    90,   // střed 80–100 g
        intra_workout_carbs:  70,   // střed 60–80 g/h
        post_workout_protein: 35,   // střed 30–40 g
        post_workout_carbs:   70,   // střed 60–80 g
        warnings,
      };
    }

    // ── BUILD 2 (intenzita) ──────────────────────────────
    case 'build_2': {
      const { min, max } = carbsPerKgByTSS(tss);
      const carbsMidPerKg = (min + max) / 2;
      const kcal      = Math.round(bmr * 1.75 + trainingKcal); // střed 1.7–1.8
      const protein_g = Math.round(weightKg * 1.9);
      const carbs_g   = Math.round(weightKg * carbsMidPerKg);
      const fat_g     = Math.round(weightKg * 0.9);             // střed 0.8–1.0
      const intake    = carbs_g * 4 + protein_g * 4 + fat_g * 9;
      if (intake < trainingKcal + bmr - 200) warnings.push(`⚠️ Příjem je o více než 200 kcal pod výdejem — doplň ${Math.round(trainingKcal + bmr - 200 - intake)} kcal!`);
      return {
        phase, kcal, carbs_g, protein_g, fat_g,
        water_glasses: 10,
        notes: [
          'Periodizace sacharidů dle TSS každý den!',
          `TSS ${tss}: ${min}–${max} g/kg sacharidů dnes`,
          'Po posilovně zvýšit protein na 2.2 g/kg',
        ],
        forbidden_foods: ['Alkohol', 'Prázdné kalorie'],
        recommended_foods: ['Těstoviny', 'Bílá rýže', 'Ovesné vločky', 'Kuřecí maso', 'Tvaroh', 'Vejce', 'Banány'],
        supplements: ['Kreatin 3–5 g/den', 'Hořčík 400 mg večer', 'Vitamín C 500 mg/den', 'Beta-alanin 3.2 g/den', 'Ashwagandha 600 mg večer'],
        pre_workout_carbs:    90,
        intra_workout_carbs:  70,
        post_workout_protein: 35,
        post_workout_carbs:   70,
        warnings,
      };
    }

    // ── PRE RACE ─────────────────────────────────────────
    case 'pre_race': {
      const kcal      = Math.round(bmr * 1.7 + trainingKcal);
      const protein_g = Math.round(weightKg * 1.9);
      const carbs_g   = Math.round(weightKg * 7);  // střed 6–8
      const fat_g     = Math.round(weightKg * 0.9);
      if (tss > 85) warnings.push('Vysoké TSS — ŽÁDNÝ deficit, doplň sacharidy ihned po tréninku!');
      return {
        phase, kcal, carbs_g, protein_g, fat_g,
        water_glasses: 10,
        notes: [
          'Kritické: vysoké TSS týdny (600+) = žádný deficit',
          'Threshold a VO2max — maximální příjem sacharidů',
        ],
        forbidden_foods: ['Alkohol', 'Tučná jídla před výkonem'],
        recommended_foods: ['Těstoviny', 'Rýže', 'Banány', 'Med', 'Kuřecí maso', 'Izotonické nápoje'],
        supplements: ['Kreatin 3–5 g/den', 'Hořčík 400 mg večer', 'Vitamín C 500 mg/den', 'Beta-alanin 3.2 g/den'],
        pre_workout_carbs:    90,
        intra_workout_carbs:  70,
        post_workout_protein: 35,
        post_workout_carbs:   70,
        warnings,
      };
    }

    // ── RACE WEEK ────────────────────────────────────────
    case 'race_week': {
      // Základní race week (7–4 dny před závodem, tapering)
      const kcal      = Math.round(bmr * 1.5 + trainingKcal);
      const protein_g = Math.round(weightKg * 1.8);
      const carbs_g   = Math.round(weightKg * 5.5); // střed 5–6
      const fat_kcal  = kcal - carbs_g * 4 - protein_g * 4;
      const fat_g     = Math.max(Math.round(fat_kcal / 9), Math.round(weightKg * 0.7));
      return {
        phase, kcal, carbs_g, protein_g, fat_g,
        water_glasses: 10,
        notes: [
          'Tapering — snižuj tréninkový objem, udržuj intenzitu',
          'Hydratace min. 10 sklenic/den',
        ],
        forbidden_foods: [],
        recommended_foods: ['Těstoviny', 'Bílá rýže', 'Banány', 'Med', 'Kuřecí maso'],
        supplements: ['Hořčík 400 mg (prevence křečí)', 'Vitamín C 500 mg', 'Elektrolyty — zvýšit sodík (3–5 g Na/den)'],
        warnings: [],
      };
    }

    // ── RACE DAY ─────────────────────────────────────────
    case 'race_day': {
      // Race day celkový příjem je definován protokolem
      const kcal      = Math.round(bmr * 1.8 + trainingKcal);
      const protein_g = Math.round(weightKg * 2.0);
      const carbs_g   = Math.round(weightKg * 10); // max carb-loading + na kole
      const fat_g     = Math.round(weightKg * 0.6);
      return {
        phase, kcal, carbs_g, protein_g, fat_g,
        water_glasses: 14,
        notes: [
          '–3h: Snídaně 700–800 kcal (ovesná kaše + vejce + banán + med)',
          '–1h: Banán + 500 ml izotoniku',
          'NA KOLE: 60–80 g sacharidů/h každých 45 min',
          'Po závodě do 30 min: 300–400 kcal (Restart Drink + banán)',
        ],
        forbidden_foods: ['Tučné maso', 'Smažená jídla', 'Luštěniny', 'Syrová zelenina', 'Alkohol'],
        recommended_foods: ['Ovesná kaše', 'Vejce', 'Banán', 'Med', 'Izotonický nápoj', 'Energie gely', 'Rýžové chlebíčky'],
        supplements: ['Hořčík 400 mg (prevence křečí)', 'Elektrolyty', 'Kofein 200 mg (3 mg/kg) 45 min před startem'],
        intra_workout_carbs: 70,
        warnings: [],
      };
    }

    // ── POST RACE ────────────────────────────────────────
    case 'post_race': {
      const kcal      = Math.round(bmr * 1.4);
      const protein_g = Math.round(weightKg * 2.1); // střed 2.0–2.2
      const carbs_g   = Math.round(weightKg * 4.5); // střed 4–5
      const fat_kcal  = kcal - carbs_g * 4 - protein_g * 4;
      const fat_g     = Math.max(Math.round(fat_kcal / 9), Math.round(weightKg * 0.8));
      return {
        phase, kcal, carbs_g, protein_g, fat_g,
        water_glasses: 10,
        notes: [
          'Žádný trénink první 3–5 dní',
          'Priorita: protein pro opravu svalů',
          'Doplňování glykogenu — sacharidy bez obav',
        ],
        forbidden_foods: [],
        recommended_foods: ['Tvaroh', 'Vejce', 'Kuřecí maso', 'Rýže', 'Těstoviny', 'Banány', 'Ovoce'],
        supplements: ['Hořčík 400 mg večer', 'Omega-3 2–3 g/den', 'Vitamín D 2000 IU/den'],
        warnings: [],
      };
    }

    default:
      return {
        phase: 'off_season', kcal: bmr, carbs_g: 0, protein_g: 0, fat_g: 0,
        water_glasses: 8, notes: [], forbidden_foods: [], recommended_foods: [],
        supplements: [], warnings: [],
      };
  }
}

// ── Carb-loading (3–2 dny před závodem) ──────────────────
export function calculateCarbLoadingTarget(
  weightKg: number,
  bmr: number,
): DailyNutritionTarget {
  const kcal      = Math.round(bmr * 1.6);
  const carbs_g   = Math.round(weightKg * 9); // střed 8–10
  const protein_g = Math.round(weightKg * 1.6);
  const fat_g     = Math.min(Math.round(weightKg * 1.0), Math.round((kcal - carbs_g * 4 - protein_g * 4) / 9));

  return {
    phase: 'race_week',
    kcal,
    carbs_g,
    protein_g,
    fat_g: Math.max(fat_g, 30),
    water_glasses: 13,
    notes: [
      'CARB-LOADING: maximální plnění glykogenových zásob!',
      'Velká pasta večeře do 19:00',
      'Po 20:00 pouze tvaroh + med',
      'Hydratace 12–14 sklenic/den',
    ],
    forbidden_foods: [
      'Vláknina (brokolice, zelí, fazole)',
      'Syrová zelenina',
      'Luštěniny',
      'Smažená jídla',
      'Alkohol',
      'Nová nebo neznámá jídla',
    ],
    recommended_foods: ['Těstoviny', 'Bílá rýže', 'Banány', 'Med', 'Rýžové chlebíčky', 'Izotonické nápoje', 'Tvaroh'],
    supplements: ['Hořčík 400 mg (prevence křečí)', 'Vitamín C 500 mg', 'Elektrolyty — zvýšit sodík 3–5 g Na/den'],
    warnings: [],
  };
}

// ── Výpočet compliance skóre (0–100) ────────────────────────
export function calcComplianceScore(
  targetKcal: number,
  actualKcal: number,
  targetCarbs: number,
  actualCarbs: number,
  targetProtein: number,
  actualProtein: number,
): number {
  const kcalRatio    = Math.min(actualKcal    / Math.max(targetKcal, 1),    1.2);
  const carbsRatio   = Math.min(actualCarbs   / Math.max(targetCarbs, 1),   1.2);
  const proteinRatio = Math.min(actualProtein / Math.max(targetProtein, 1), 1.2);

  // Optimum je 1.0 (100%), penalizace za přebytek i deficit
  const kcalScore    = 100 - Math.abs(kcalRatio    - 1.0) * 120;
  const carbsScore   = 100 - Math.abs(carbsRatio   - 1.0) * 120;
  const proteinScore = 100 - Math.abs(proteinRatio - 1.0) * 120;

  return Math.max(0, Math.round((kcalScore * 0.4 + carbsScore * 0.35 + proteinScore * 0.25)));
}
