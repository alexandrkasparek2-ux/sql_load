// ============================================================
// useNutritionCompliance.ts
// Hook pro výpočet týdenního compliance skóre —
// porovnává skutečný příjem vs. cílové hodnoty za posledních 7 dní.
// Data čte z Supabase tabulek nutrition_targets a food_entries.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { calcComplianceScore } from '../services/nutritionTargetService';
import { formatLocalISODate, addDaysLocalISO } from '../utils/date';

export interface DailyComplianceEntry {
  date:           string; // yyyy-mm-dd
  target_kcal:    number;
  actual_kcal:    number;
  target_carbs:   number;
  actual_carbs:   number;
  target_protein: number;
  actual_protein: number;
  compliance:     number; // 0–100
}

interface UseNutritionComplianceResult {
  entries:          DailyComplianceEntry[];
  weeklyScore:      number; // průměr 7 dní
  loading:          boolean;
  reload:           () => void;
  saveTarget:       (date: string, target: {
    kcal: number; carbs: number; protein: number; fat: number; phase: string;
  }) => Promise<void>;
  saveActual:       (date: string, actual: {
    kcal: number; carbs: number; protein: number; fat: number;
  }) => Promise<void>;
}

export function useNutritionCompliance(
  userId: string | undefined,
): UseNutritionComplianceResult {
  const [entries, setEntries] = useState<DailyComplianceEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    // Načti posledních 7 dní
    const today    = new Date();
    const fromDate = formatLocalISODate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));
    const toDate   = formatLocalISODate(today);

    const [targetsRes, foodRes] = await Promise.all([
      supabase
        .from('nutrition_targets')
        .select('date, target_kcal, target_carbs_g, target_protein_g, actual_kcal, actual_carbs_g, actual_protein_g')
        .eq('user_id', userId)
        .gte('date', fromDate)
        .lte('date', toDate),
      supabase
        .from('food_entries')
        .select('date, kcal, carbs, protein')
        .eq('user_id', userId)
        .gte('date', fromDate)
        .lte('date', toDate),
    ]);

    // Agreguj food_entries per den
    const foodByDate: Record<string, { kcal: number; carbs: number; protein: number }> = {};
    for (const row of (foodRes.data ?? [])) {
      const d = row.date as string;
      if (!foodByDate[d]) foodByDate[d] = { kcal: 0, carbs: 0, protein: 0 };
      foodByDate[d].kcal    += Number(row.kcal    ?? 0);
      foodByDate[d].carbs   += Number(row.carbs   ?? 0);
      foodByDate[d].protein += Number(row.protein ?? 0);
    }

    // Sestav výsledná data
    const result: DailyComplianceEntry[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDaysLocalISO(fromDate, i);
      const tRow = (targetsRes.data ?? []).find(r => r.date === date);
      const food = foodByDate[date] ?? { kcal: 0, carbs: 0, protein: 0 };

      const tKcal    = Number(tRow?.target_kcal     ?? 0);
      const tCarbs   = Number(tRow?.target_carbs_g  ?? 0);
      const tProtein = Number(tRow?.target_protein_g ?? 0);

      // Skutečný příjem: preferuj nutrition_targets.actual_*, fallback na food_entries agregaci
      const aKcal    = Number(tRow?.actual_kcal     ?? food.kcal);
      const aCarbs   = Number(tRow?.actual_carbs_g  ?? food.carbs);
      const aProtein = Number(tRow?.actual_protein_g ?? food.protein);

      const compliance = tKcal > 0
        ? calcComplianceScore(tKcal, aKcal, tCarbs, aCarbs, tProtein, aProtein)
        : 0;

      result.push({
        date, target_kcal: tKcal, actual_kcal: aKcal,
        target_carbs: tCarbs, actual_carbs: aCarbs,
        target_protein: tProtein, actual_protein: aProtein,
        compliance,
      });
    }

    setEntries(result);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const weeklyScore = entries.length > 0
    ? Math.round(entries.reduce((s, e) => s + e.compliance, 0) / entries.filter(e => e.target_kcal > 0).length || 0)
    : 0;

  // Uloží denní cíl do nutrition_targets
  const saveTarget = async (
    date: string,
    target: { kcal: number; carbs: number; protein: number; fat: number; phase: string },
  ): Promise<void> => {
    if (!userId) return;
    await supabase.from('nutrition_targets').upsert(
      {
        user_id: userId,
        date,
        phase:            target.phase,
        target_kcal:      target.kcal,
        target_carbs_g:   target.carbs,
        target_protein_g: target.protein,
        target_fat_g:     target.fat,
      },
      { onConflict: 'user_id,date' },
    );
  };

  // Uloží skutečný příjem do nutrition_targets
  const saveActual = async (
    date: string,
    actual: { kcal: number; carbs: number; protein: number; fat: number },
  ): Promise<void> => {
    if (!userId) return;
    const score = entries.find(e => e.date === date)?.compliance ?? 0;
    await supabase.from('nutrition_targets').upsert(
      {
        user_id:          userId,
        date,
        actual_kcal:      actual.kcal,
        actual_carbs_g:   actual.carbs,
        actual_protein_g: actual.protein,
        actual_fat_g:     actual.fat,
        compliance_score: score,
      },
      { onConflict: 'user_id,date' },
    );
  };

  return { entries, weeklyScore, loading, reload: load, saveTarget, saveActual };
}
