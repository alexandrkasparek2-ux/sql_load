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
  burned:  number; // celkový výdej: BMR + aktivita z Intervals.icu
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
) {
  const [data,    setData]    = useState<DayKcal[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const dates = getLastNDates(days);

    const today = todayLocalISO();
    const historicalDates = dates.filter(d => d < today);

    const [{ data: rows }, storedGoals, burnLog, snapshots] = await Promise.all([
      supabase
        .from('food_entries')
        .select('date, kcal, carbs, protein, fat')
        .eq('user_id', userId)
        .in('date', dates),
      loadDailyGoals(userId),
      Promise.resolve(loadBurnLog()),
      historicalDates.length > 0
        ? loadSnapshotBatch(userId, historicalDates)
        : Promise.resolve({} as Record<string, import('../services/dailySnapshotService').DailySnapshot>),
    ]);

    const grouped: DayKcal[] = dates.map(date => {
      const dayRows = (rows ?? []).filter(r => r.date === date);
      const snap    = snapshots[date] ?? null;

      // ── Goal = expenditure (BMR + Intervals.icu activity, no deficit) ──────
      // Priority:
      //   1) burnLog (fresh Intervals.icu data)
      //   2) Frozen snapshot (burnLog expired)
      //   3) BMR-only baseline (no Intervals.icu, no snapshot)
      //   4) storedGoals (legacy fallback)
      //   5) fallbackGoal prop
      let goal = fallbackGoal;
      if (profile && typeof burnLog[date] === 'number') {
        goal = Math.max(1200, Math.round(calcCalories(profile, 'rest', 0) + burnLog[date]));
      } else if (snap?.goal_kcal) {
        goal = snap.goal_kcal;
      } else if (profile) {
        goal = Math.max(1200, Math.round(calcCalories(profile, 'rest', 0)));
      } else if (storedGoals[date]) {
        goal = storedGoals[date];
      }

      // ── Burned = goal (expenditure-based, goal IS burned) ─────────────────
      let burned = 0;
      if (profile && typeof burnLog[date] === 'number') {
        burned = Math.round(calcCalories(profile, 'rest', 0)) + burnLog[date];
      } else if (snap?.goal_kcal) {
        // goal was already stored as expenditure — burned = goal
        burned = snap.goal_kcal;
      } else if (profile) {
        burned = Math.round(calcCalories(profile, 'rest', 0));
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
  }, [userId, days, profile, fallbackGoal]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, reload: load };
}
