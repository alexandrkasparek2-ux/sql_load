import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { loadDailyGoals } from './useDailyGoals';

export interface DayKcal {
  date:    string; // YYYY-MM-DD
  kcal:    number;
  carbs:   number;
  protein: number;
  fat:     number;
  goal:    number; // kcal cíl pro daný den (uložený v localStorage)
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

export function useWeeklyData(userId: string | undefined, days = 14) {
  const [data,    setData]    = useState<DayKcal[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const dates = getLastNDates(days);

    const { data: rows } = await supabase
      .from('food_entries')
      .select('date, kcal, carbs, protein, fat')
      .eq('user_id', userId)
      .in('date', dates);

    const storedGoals = loadDailyGoals();
    const grouped: DayKcal[] = dates.map(date => {
      const dayRows = (rows ?? []).filter(r => r.date === date);
      return {
        date,
        label:   dayLabel(date),
        dateNum: dayNum(date),
        kcal:    dayRows.reduce((s, r) => s + (r.kcal    as number), 0),
        carbs:   dayRows.reduce((s, r) => s + (r.carbs   as number), 0),
        protein: dayRows.reduce((s, r) => s + (r.protein as number), 0),
        fat:     dayRows.reduce((s, r) => s + (r.fat     as number), 0),
        goal:    storedGoals[date] ?? 0,
      };
    });

    setData(grouped);
    setLoading(false);
  }, [userId, days]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, reload: load };
}
