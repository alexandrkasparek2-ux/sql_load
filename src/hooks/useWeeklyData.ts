import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface DayKcal {
  date:  string; // YYYY-MM-DD
  kcal:  number;
  label: string; // 'Po', 'Út', …
}

const CS_DAYS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

function getLast7Dates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return CS_DAYS[d.getDay()];
}

export function useWeeklyData(userId: string | undefined) {
  const [data,    setData]    = useState<DayKcal[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const dates = getLast7Dates();

    const { data: rows } = await supabase
      .from('food_entries')
      .select('date, kcal')
      .eq('user_id', userId)
      .in('date', dates);

    const grouped: DayKcal[] = dates.map(date => ({
      date,
      label: dayLabel(date),
      kcal: (rows ?? [])
        .filter(r => r.date === date)
        .reduce((s, r) => s + (r.kcal as number), 0),
    }));

    setData(grouped);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, reload: load };
}
