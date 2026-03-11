import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface SupplementEntry {
  id?:              string;
  user_id:          string;
  date:             string;
  supplement_id:    string;
  supplement_name:  string;
  dose:             number;
  unit:             string;
  taken:            boolean;
}

export function useSupplements(userId: string | undefined, date: string) {
  const [entries,  setEntries]  = useState<SupplementEntry[]>([]);
  const [loading,  setLoading]  = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('supplement_log')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date);
    setEntries((data as SupplementEntry[]) ?? []);
    setLoading(false);
  }, [userId, date]);

  useEffect(() => { load(); }, [load]);

  /** Toggle existing entry or create new one */
  const toggle = async (
    supplementId: string,
    supplementName: string,
    dose: number,
    unit: string,
  ): Promise<void> => {
    if (!userId) return;
    const existing = entries.find(e => e.supplement_id === supplementId);

    if (existing?.id) {
      // Toggle taken flag
      const newTaken = !existing.taken;
      await supabase
        .from('supplement_log')
        .update({ taken: newTaken })
        .eq('id', existing.id);
      setEntries(prev => prev.map(e =>
        e.id === existing.id ? { ...e, taken: newTaken } : e,
      ));
    } else {
      // Insert new entry (taken = true)
      const payload: Omit<SupplementEntry, 'id'> = {
        user_id: userId, date,
        supplement_id: supplementId,
        supplement_name: supplementName,
        dose, unit,
        taken: true,
      };
      const { data, error } = await supabase
        .from('supplement_log')
        .upsert(payload, { onConflict: 'user_id,date,supplement_id' })
        .select('*')
        .single();
      if (!error && data) {
        setEntries(prev => {
          const filtered = prev.filter(e => e.supplement_id !== supplementId);
          return [...filtered, data as SupplementEntry];
        });
      }
    }
  };

  /** Update dose for a supplement (upsert) */
  const setDose = async (
    supplementId: string,
    supplementName: string,
    dose: number,
    unit: string,
  ): Promise<void> => {
    if (!userId) return;
    const existing = entries.find(e => e.supplement_id === supplementId);
    if (existing?.id) {
      await supabase.from('supplement_log').update({ dose }).eq('id', existing.id);
      setEntries(prev => prev.map(e =>
        e.id === existing.id ? { ...e, dose } : e,
      ));
    } else {
      const payload: Omit<SupplementEntry, 'id'> = {
        user_id: userId, date,
        supplement_id: supplementId,
        supplement_name: supplementName,
        dose, unit, taken: false,
      };
      const { data, error } = await supabase
        .from('supplement_log')
        .upsert(payload, { onConflict: 'user_id,date,supplement_id' })
        .select('*')
        .single();
      if (!error && data) {
        setEntries(prev => {
          const filtered = prev.filter(e => e.supplement_id !== supplementId);
          return [...filtered, data as SupplementEntry];
        });
      }
    }
  };

  const isTaken = (supplementId: string) =>
    entries.find(e => e.supplement_id === supplementId)?.taken ?? false;

  const getDose = (supplementId: string, defaultDose: number) =>
    entries.find(e => e.supplement_id === supplementId)?.dose ?? defaultDose;

  const takenCount = entries.filter(e => e.taken).length;

  return { entries, loading, toggle, setDose, isTaken, getDose, takenCount, reload: load };
}
