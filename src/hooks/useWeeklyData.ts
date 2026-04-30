import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { loadDailyGoals } from './useDailyGoals';
import { calcBMR, calcCalories, type CalcProfile } from '../constants/training';
import { loadBurnLog } from '../services/intervalsService';

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
    return d.toISOString().split('T')[0];
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

    // Fetch food entries and training days in parallel
    const [{ data: rows }, { data: trainRows }] = await Promise.all([
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
    ]);

    // synced goals as secondary fallback (for days without training_days row)
    const storedGoals = await loadDailyGoals(userId);
    const burnLog = loadBurnLog();

    const grouped: DayKcal[] = dates.map(date => {
      const dayRows  = (rows      ?? []).filter(r => r.date === date);
      const trainRow = (trainRows ?? []).find(r  => r.date === date);

      // Goal = intake target = expenditure – deficit
      // Priority: 1) Intervals burn log (most accurate), 2) DB training type,
      //           3) rest-day baseline, 4) storedGoals, 5) fallback
      let goal = fallbackGoal;
      if (profile) {
        let rawKcal: number;
        if (typeof burnLog[date] === 'number') {
          // Actual activity data from Intervals — most accurate
          rawKcal = Math.round(calcBMR(profile) * 1.15 + burnLog[date]);
        } else if (trainRow) {
          rawKcal = Math.round(calcCalories(profile, trainRow.training_type, trainRow.ride_hours ?? 0));
        } else {
          rawKcal = Math.round(calcCalories(profile, 'rest', 0));
        }
        goal = Math.max(1200, rawKcal - deficitKcal);
      } else if (storedGoals[date]) {
        goal = storedGoals[date];
      }

      // Total expenditure = BMR + activity (same formula as goal calculation)
      // Prefer persistent Intervals burn log for historical activity kcal so
      // chart lines don't shift when short-lived activity cache rotates.
      let burned = 0;
      if (profile) {
        if (typeof burnLog[date] === 'number') {
          // BMR × 1.15 = non-exercise daily metabolism (NEAT); plus actual exercise kcal.
          // Rest-day baseline uses ×1.2; we use ×1.15 here to avoid double-counting
          // with logged activities that may include low-intensity movement.
          burned = Math.round(calcBMR(profile) * 1.15 + burnLog[date]);
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
