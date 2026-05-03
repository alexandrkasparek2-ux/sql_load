import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  calcBMR, calcCalories, calcMacros, calcWater,
  type CalcProfile, type TrainingType,
} from '../constants/training';
import { loadBurnLog } from '../services/intervalsService';
import { saveSnapshot, loadSnapshotBatch } from '../services/dailySnapshotService';

function getHistoricalDates(n: number): string[] {
  const today = new Date().toISOString().split('T')[0];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - i));
    return d.toISOString().split('T')[0];
  }).filter(d => d < today);
}

/**
 * One-time backfill: for the last `days` historical dates that have no
 * snapshot yet, compute + persist a snapshot from existing food_entries,
 * training_days, and the burnLog cache.
 */
export function useBackfillSnapshots(
  userId:      string | undefined,
  profile:     CalcProfile | null | undefined,
  deficitKcal: number,
  days        = 7,
) {
  const ran = useRef(false);

  useEffect(() => {
    if (!userId || !profile || ran.current) return;
    ran.current = true;

    void (async () => {
      const historicalDates = getHistoricalDates(days);
      if (historicalDates.length === 0) return;

      // Which dates are already frozen?
      const existing = await loadSnapshotBatch(userId, historicalDates);
      const missing  = historicalDates.filter(d => !existing[d]);
      if (missing.length === 0) return;

      // Batch-load food entries + training days for missing dates
      const [{ data: foodRows }, { data: trainRows }] = await Promise.all([
        supabase
          .from('food_entries')
          .select('date, kcal, carbs, protein, fat, fiber')
          .eq('user_id', userId)
          .in('date', missing),
        supabase
          .from('training_days')
          .select('date, training_type, ride_hours')
          .eq('user_id', userId)
          .in('date', missing),
      ]);

      const burnLog = loadBurnLog();

      for (const date of missing) {
        const dayFood  = (foodRows  ?? []).filter(r => r.date === date);
        const trainRow = (trainRows ?? []).find(r  => r.date === date);
        const actKcal  = burnLog[date] ?? 0;

        // Skip days with absolutely no data
        const consumed_kcal = dayFood.reduce((s, r) => s + (r.kcal as number), 0);
        if (consumed_kcal === 0 && actKcal === 0 && !trainRow) continue;

        // ── goal_kcal ──────────────────────────────────────────────────────
        let rawKcal: number;
        if (actKcal > 0) {
          rawKcal = Math.round(calcBMR(profile) * 1.15 + actKcal);
        } else if (trainRow) {
          rawKcal = Math.round(
            calcCalories(profile, trainRow.training_type as TrainingType, trainRow.ride_hours ?? 0),
          );
        } else {
          rawKcal = Math.round(calcCalories(profile, 'rest', 0));
        }
        const goal_kcal = Math.max(1200, rawKcal - deficitKcal);

        // ── macro + water goals ────────────────────────────────────────────
        const trainingType = (trainRow?.training_type ?? 'rest') as TrainingType;
        const m            = calcMacros(profile, trainingType);
        const rideHours    = trainRow?.ride_hours ?? (actKcal > 0 ? 1 : 0);

        await saveSnapshot({
          user_id:          userId,
          date,
          updated_at:       new Date().toISOString(),
          consumed_kcal,
          consumed_carbs:   dayFood.reduce((s, r) => s + (r.carbs   as number), 0),
          consumed_protein: dayFood.reduce((s, r) => s + (r.protein as number), 0),
          consumed_fat:     dayFood.reduce((s, r) => s + (r.fat     as number), 0),
          consumed_fiber:   dayFood.reduce((s, r) => s + ((r.fiber  as number) ?? 0), 0),
          goal_kcal,
          goal_carbs:       m.carbs,
          goal_protein:     m.protein,
          goal_fat:         m.fat,
          goal_water:       calcWater(profile, rideHours),
          goal_fiber:       Math.min(45, Math.max(25, Math.round(goal_kcal * 0.014))),
          activity_kcal:    actKcal,
          activity_source:  actKcal > 0 ? 'intervals' : trainRow ? 'manual' : 'none',
          deficit_kcal:     deficitKcal,
        });
      }
    })();
  }, [userId, profile, deficitKcal, days]);
}
