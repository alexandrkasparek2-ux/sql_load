import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface WeightEntry {
  id:        string;
  date:      string;
  weight_kg: number;
}

const LS_KEY = (userId: string) => `cyclofuel_weight_log_${userId}`;

function loadLocal(userId: string): WeightEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as Array<{ date: string; weight: number }>;
    return arr.map((e, i) => ({ id: `local_${i}`, date: e.date, weight_kg: e.weight }));
  } catch { return []; }
}

export function useWeightLog(userId: string | undefined) {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('weight_log')
        .select('id, date, weight_kg')
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .limit(90);

      if (error) throw error;
      if (data && data.length > 0) {
        setEntries(data as WeightEntry[]);
      } else {
        // Migrate from localStorage if Supabase is empty
        const local = loadLocal(userId);
        if (local.length > 0) {
          setEntries(local);
          // Upload local data to Supabase
          const rows = local.map(e => ({ user_id: userId, date: e.date, weight_kg: e.weight_kg }));
          await supabase.from('weight_log').upsert(rows, { onConflict: 'user_id,date' });
        }
      }
    } catch {
      // Fallback to localStorage if table doesn't exist yet
      setEntries(loadLocal(userId));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const addEntry = useCallback(async (date: string, weight_kg: number) => {
    if (!userId) return;
    const optimistic: WeightEntry = { id: `opt_${Date.now()}`, date, weight_kg };
    setEntries(prev => {
      const filtered = prev.filter(e => e.date !== date);
      return [...filtered, optimistic].sort((a, b) => a.date.localeCompare(b.date));
    });
    try {
      const { data } = await supabase
        .from('weight_log')
        .upsert({ user_id: userId, date, weight_kg }, { onConflict: 'user_id,date' })
        .select('id, date, weight_kg')
        .single();
      if (data) {
        setEntries(prev => prev.map(e => e.id === optimistic.id ? (data as WeightEntry) : e));
      }
    } catch {
      // Keep optimistic update; also persist locally as fallback
      const all = entries.filter(e => e.date !== date).map(e => ({ date: e.date, weight: e.weight_kg }));
      all.push({ date, weight: weight_kg });
      all.sort((a, b) => a.date.localeCompare(b.date));
      localStorage.setItem(LS_KEY(userId), JSON.stringify(all.slice(-60)));
    }
  }, [userId, entries]);

  const deleteEntry = useCallback(async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    try {
      await supabase.from('weight_log').delete().eq('id', id);
    } catch { /* ignore */ }
  }, []);

  return { entries, loading, addEntry, deleteEntry, reload: load };
}
