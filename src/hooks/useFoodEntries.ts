import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface FoodEntry {
  id?:       string;
  user_id:   string;
  date:      string;
  meal_slot: string;
  food_id:   string;
  food_name: string;
  grams:     number;
  kcal:      number;
  carbs:     number;
  protein:   number;
  fat:       number;
  na:        number;
  k:         number;
  mg:        number;
  ca:        number;
  fe:        number;
  vit_c:     number;
  vit_d:     number;
  b12:       number;
  omega3:    number;
  zn:        number;
}

export interface MacroTotals {
  kcal:    number;
  carbs:   number;
  protein: number;
  fat:     number;
  na:      number;
  k:       number;
  mg:      number;
  ca:      number;
  fe:      number;
  vit_c:   number;
  vit_d:   number;
  b12:     number;
  omega3:  number;
  zn:      number;
}

const ZERO: MacroTotals = {
  kcal: 0, carbs: 0, protein: 0, fat: 0,
  na: 0, k: 0, mg: 0, ca: 0, fe: 0,
  vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0,
};

function sumEntries(entries: FoodEntry[]): MacroTotals {
  return entries.reduce<MacroTotals>((acc, e) => ({
    kcal:    acc.kcal    + e.kcal,
    carbs:   acc.carbs   + e.carbs,
    protein: acc.protein + e.protein,
    fat:     acc.fat     + e.fat,
    na:      acc.na      + e.na,
    k:       acc.k       + e.k,
    mg:      acc.mg      + e.mg,
    ca:      acc.ca      + e.ca,
    fe:      acc.fe      + e.fe,
    vit_c:   acc.vit_c   + e.vit_c,
    vit_d:   acc.vit_d   + e.vit_d,
    b12:     acc.b12     + e.b12,
    omega3:  acc.omega3  + e.omega3,
    zn:      acc.zn      + e.zn,
  }), { ...ZERO });
}

export function useFoodEntries(userId: string | undefined, date: string) {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: true });
    setEntries((data as FoodEntry[]) ?? []);
    setLoading(false);
  }, [userId, date]);

  useEffect(() => { load(); }, [load]);

  const addEntry = async (entry: Omit<FoodEntry, 'id'>): Promise<void> => {
    const { data, error } = await supabase
      .from('food_entries')
      .insert(entry)
      .select('*')
      .single();
    if (!error && data) setEntries(prev => [...prev, data as FoodEntry]);
  };

  const removeEntry = async (id: string): Promise<void> => {
    await supabase.from('food_entries').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const totals = sumEntries(entries);

  return { entries, totals, loading, addEntry, removeEntry, reload: load };
}
