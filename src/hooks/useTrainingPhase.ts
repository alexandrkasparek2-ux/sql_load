// ============================================================
// useTrainingPhase.ts
// Hook pro detekci aktuální tréninkové fáze na základě dat závodů
// uložených v Supabase tabulce race_events.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  getPhaseInfo,
  type PhaseInfo,
  type RaceEvent,
} from '../services/phaseDetectionService';

interface UseTrainingPhaseResult {
  phaseInfo:    PhaseInfo | null;
  nextRace:     RaceEvent | null;
  lastRace:     RaceEvent | null;
  allRaces:     RaceEvent[];
  loading:      boolean;
  reload:       () => void;
  saveRace:     (race: Omit<RaceEvent, 'id' | 'user_id'>) => Promise<void>;
  deleteRace:   (id: string) => Promise<void>;
}

export function useTrainingPhase(userId: string | undefined): UseTrainingPhaseResult {
  const [allRaces, setAllRaces] = useState<RaceEvent[]>([]);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('race_events')
      .select('*')
      .eq('user_id', userId)
      .order('race_date', { ascending: true });
    if (data) setAllRaces(data as RaceEvent[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Nejbližší budoucí závod (nebo dnes)
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  const futureRaces = allRaces
    .filter(r => r.race_date >= todayISO)
    .sort((a, b) => a.race_date.localeCompare(b.race_date));

  const pastRaces = allRaces
    .filter(r => r.race_date < todayISO)
    .sort((a, b) => b.race_date.localeCompare(a.race_date));

  const nextRace = futureRaces[0] ?? null;
  const lastRace = pastRaces[0] ?? null;

  const nextRaceDate = nextRace
    ? new Date(`${nextRace.race_date}T00:00:00`)
    : null;
  const lastRaceDate = lastRace
    ? new Date(`${lastRace.race_date}T00:00:00`)
    : null;

  const phaseInfo = getPhaseInfo(today, nextRaceDate, lastRaceDate);

  const saveRace = async (race: Omit<RaceEvent, 'id' | 'user_id'>): Promise<void> => {
    if (!userId) return;
    await supabase.from('race_events').insert({ ...race, user_id: userId });
    await load();
  };

  const deleteRace = async (id: string): Promise<void> => {
    await supabase.from('race_events').delete().eq('id', id);
    setAllRaces(prev => prev.filter(r => r.id !== id));
  };

  return { phaseInfo, nextRace, lastRace, allRaces, loading, reload: load, saveRace, deleteRace };
}
