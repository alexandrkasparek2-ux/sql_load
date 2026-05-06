import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { loadDailyGoals } from './useDailyGoals';
import { calcCalories, type CalcProfile } from '../constants/training';
import { loadBurnLog } from '../services/intervalsService';
import { loadSnapshotBatch } from '../services/dailySnapshotService';
import { formatLocalISODate, todayLocalISO } from '../utils/date';

export interface DayKcal {
  date:    string; // YYYY-MM-DD
  kcal:    number;
  carbs:   number;
  protein: number;
  fat:     number;
  goal:    number; // kcal cíl pro daný den
  burned:  number; // celkový výdej: BMR + aktivita (calcCalories)
  label:   string; // 'Po', 'Út', …
  dateNum: number; // day of month (e.g. 10)
}

const CS_DAYS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

function getLastNDates(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return formatLocalISODate(d);
  });
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return CS_DAYS[d.getDay()];
}

function dayNum(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDate();
}

export function useWeeklyData(
  userId:      string | undefined,
  days        = 14,
  profile?:    CalcProfile | null,
  fallbackGoal = 0,
  deficitKcal  = 0,
) {
  const [data,    setData]    = useState<DayKcal[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const dates = getLastNDates(days);

    // Fetch food entries, training days, and snapshots in parallel
    const today = todayLocalISO();
    const historicalDates = dates.filter(d => d < today);

    const [{ data: rows }, { data: trainRows }, storedGoals, burnLog, snapshots] = await Promise.all([
      supabase
        .from('food_entries')
        .select('date, kcal, carbs, protein, fat')
        .eq('user_id', userId)
        .in('date', dates),
      supabase
        .from('training_days')
        .select('date, training_type, ride_hours')
        .eq('user_id', userId)
        .in('date', dates),
      loadDailyGoals(userId),
      Promise.resolve(loadBurnLog()),
      historicalDates.length > 0
        ? loadSnapshotBatch(userId, historicalDates)
        : Promise.resolve({} as Record<string, import('../services/dailySnapshotService').DailySnapshot>),
    ]);

    const grouped: DayKcal[] = dates.map(date => {
      const dayRows  = (rows      ?? []).filter(r => r.date === date);
      const trainRow = (trainRows ?? []).find(r  => r.date === date);
      const snap     = snapshots[date] ?? null;

      // ── Goal ─────────────────────────────────────────────────────────────
      // Priority:
      //   1) Frozen snapshot (historical day) — most stable, prevents retroactive changes
      //   2) Intervals burn log (accurate, for today or recent days)
      //   3) DB training type
      //   4) Rest-day baseline
      //   5) storedGoals (legacy kcal-only store)
      //   6) fallback
      let goal = fallbackGoal;
      if (snap?.goal_kcal) {
        goal = snap.goal_kcal;
      } else if (profile) {
        let rawKcal: number;
        if (typeof burnLog[date] === 'number') {
          rawKcal = calcCalories(profile, 'rest', 0) + burnLog[date];
        } else if (trainRow) {
          rawKcal = Math.round(calcCalories(profile, trainRow.training_type, trainRow.ride_hours ?? 0));
        } else {
          rawKcal = Math.round(calcCalories(profile, 'rest', 0));
        }
        goal = Math.max(1200, rawKcal - deficitKcal);
      } else if (storedGoals[date]) {
        goal = storedGoals[date];
      }

      // ── Burned ────────────────────────────────────────────────────────────
      // For historical days, prefer snapshot activity_kcal so the chart line
      // doesn't shift when the Intervals.icu cache expires.
      let burned = 0;
      if (snap?.goal_kcal) {
        // Reconstruct burned from snapshot: goal = burned - planned deficit.
        // Older snapshots accidentally stored "remaining kcal" here, so only trust known planned deficits.
        const plannedDeficit = [0, 250, 500, 750].includes(snap.deficit_kcal)
          ? snap.deficit_kcal
          : deficitKcal;
        burned = snap.goal_kcal + plannedDeficit;
      } else if (profile) {
        if (typeof burnLog[date] === 'number') {
          burned = calcCalories(profile, 'rest', 0) + burnLog[date];
        } else {
          burned = trainRow
            ? Math.round(calcCalories(profile, trainRow.training_type, trainRow.ride_hours ?? 0))
            : Math.round(calcCalories(profile, 'rest', 0));
        }
      }

      return {
        date,
        label:   dayLabel(date),
        dateNum: dayNum(date),
        kcal:    dayRows.reduce((s, r) => s + (r.kcal    as number), 0),
        carbs:   dayRows.reduce((s, r) => s + (r.carbs   as number), 0),
        protein: dayRows.reduce((s, r) => s + (r.protein as number), 0),
        fat:     dayRows.reduce((s, r) => s + (r.fat     as number), 0),
        goal,
        burned,
      };
    });

    setData(grouped);
    setLoading(false);
  }, [userId, days, profile, fallbackGoal, deficitKcal]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, reload: load };
}
