import { useState, useEffect, useCallback } from 'react';
import { dbDelete, dbSelect, dbUpsert } from '../lib/dbClient';

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
      const data = await dbSelect<WeightEntry>('weight_log', {
        columns: ['id', 'date', 'weight_kg'],
        where: { user_id: userId },
        order: { column: 'date', ascending: true },
        limit: 90,
      });

      if (data && data.length > 0) {
        setEntries(data);
      } else {
        // Migrate from localStorage if Supabase is empty
        const local = loadLocal(userId);
        if (local.length > 0) {
          setEntries(local);
          // Upload local data to the remote database
          const rows = local.map(e => ({ user_id: userId, date: e.date, weight_kg: e.weight_kg }));
          await Promise.all(rows.map(row => dbUpsert('weight_log', row, ['user_id', 'date'])));
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
      const data = await dbUpsert<WeightEntry>('weight_log', { user_id: userId, date, weight_kg }, ['user_id', 'date']);
      if (data) {
        setEntries(prev => prev.map(e => e.id === optimistic.id ? data : e));
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
      await dbDelete('weight_log', { id });
    } catch { /* ignore */ }
  }, []);

  return { entries, loading, addEntry, deleteEntry, reload: load };
}
