import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  getPhaseInfo,
  PHASE_LABELS,
  PHASE_COLORS,
  PHASE_ICONS,
  PHASE_TIPS,
  type PhaseInfo,
  type RaceEvent,
  type TrainingPhase,
} from '../services/phaseDetectionService';

const LS_KEY = 'cyclofuel_phase_override';

interface UseTrainingPhaseResult {
  phaseInfo:          PhaseInfo | null;
  detectedPhaseInfo:  PhaseInfo | null;
  phaseOverride:      TrainingPhase | null;
  setPhaseOverride:   (phase: TrainingPhase) => void;
  clearPhaseOverride: () => void;
  nextRace:           RaceEvent | null;
  lastRace:           RaceEvent | null;
  allRaces:           RaceEvent[];
  loading:            boolean;
  reload:             () => void;
  saveRace:           (race: Omit<RaceEvent, 'id' | 'user_id'>) => Promise<void>;
  deleteRace:         (id: string) => Promise<void>;
}

export function useTrainingPhase(userId: string | undefined): UseTrainingPhaseResult {
  const [allRaces, setAllRaces] = useState<RaceEvent[]>([]);
  const [loading, setLoading]   = useState(false);
  const [phaseOverride, setPhaseOverrideRaw] = useState<TrainingPhase | null>(
    () => (localStorage.getItem(LS_KEY) as TrainingPhase | null),
  );

  const setPhaseOverride = (phase: TrainingPhase) => {
    localStorage.setItem(LS_KEY, phase);
    setPhaseOverrideRaw(phase);
  };

  const clearPhaseOverride = () => {
    localStorage.removeItem(LS_KEY);
    setPhaseOverrideRaw(null);
  };

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

  const nextRaceDate = nextRace ? new Date(`${nextRace.race_date}T00:00:00`) : null;
  const lastRaceDate = lastRace ? new Date(`${lastRace.race_date}T00:00:00`) : null;

  const detectedPhaseInfo = getPhaseInfo(today, nextRaceDate, lastRaceDate);

  const phaseInfo: PhaseInfo | null = phaseOverride ? {
    phase:         phaseOverride,
    label:         PHASE_LABELS[phaseOverride],
    color:         PHASE_COLORS[phaseOverride],
    icon:          PHASE_ICONS[phaseOverride],
    tip:           PHASE_TIPS[phaseOverride],
    daysToRace:    detectedPhaseInfo.daysToRace,
    daysSinceRace: detectedPhaseInfo.daysSinceRace,
  } : detectedPhaseInfo;

  const saveRace = async (race: Omit<RaceEvent, 'id' | 'user_id'>): Promise<void> => {
    if (!userId) return;
    await supabase.from('race_events').insert({ ...race, user_id: userId });
    await load();
  };

  const deleteRace = async (id: string): Promise<void> => {
    await supabase.from('race_events').delete().eq('id', id);
    setAllRaces(prev => prev.filter(r => r.id !== id));
  };

  return {
    phaseInfo,
    detectedPhaseInfo,
    phaseOverride,
    setPhaseOverride,
    clearPhaseOverride,
    nextRace,
    lastRace,
    allRaces,
    loading,
    reload: load,
    saveRace,
    deleteRace,
  };
}
