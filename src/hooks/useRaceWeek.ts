// ============================================================
// useRaceWeek.ts
// Hook pro závodní týden — specifická logika carb-loadingu,
// race day protokolu a on-bike výživy.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { RaceEvent } from '../services/phaseDetectionService';
import { formatLocalISODate } from '../utils/date';

// On-bike záznam výživy
export interface OnBikeEntry {
  id?:            string;
  user_id?:       string;
  race_event_id:  string | null;
  timestamp:      string; // ISO datetime
  item_name:      string;
  carbs_g:        number;
  kcal:           number;
  notes:          string;
}

// Závodní ráno checklist
export interface RaceMorningItem {
  id:          string;
  label:       string;
  detail:      string;
  hoursOffset: number; // hodiny před startem (záporné číslo)
  checked:     boolean;
}

interface UseRaceWeekResult {
  // Aktuální závod
  race:           RaceEvent | null;
  // Dny do závodu
  daysToRace:     number | null;
  // Zda je dnes carb-loading den (3–2 dny před závodem)
  isCarbLoading:  boolean;
  // Zda je dnes race day
  isRaceDay:      boolean;
  // Závodní ráno checklist
  morningChecklist: RaceMorningItem[];
  toggleMorningItem: (id: string) => void;
  // On-bike výživa
  onBikeEntries:  OnBikeEntry[];
  addOnBikeEntry: (entry: Omit<OnBikeEntry, 'id' | 'user_id'>) => Promise<void>;
  totalOnBikeCarbs:  number;
  totalOnBikeKcal:   number;
  // Závodní start čas
  raceStartHour:    number;
  raceStartMinute:  number;
  setRaceStartTime: (hour: number, minute: number) => void;
  loading:          boolean;
  reload:           () => void;
}

function buildMorningChecklist(raceStartHour: number, raceStartMinute: number): RaceMorningItem[] {
  return [
    {
      id: 'breakfast', hoursOffset: -3, checked: false,
      label: 'Snídaně 700–800 kcal',
      detail: 'Ovesná kaše + vejce + banán + med',
    },
    {
      id: 'water_2h', hoursOffset: -2, checked: false,
      label: '500 ml vody',
      detail: 'Hydratace 2 hodiny před startem',
    },
    {
      id: 'prep_food', hoursOffset: -1, checked: false,
      label: 'Příprava kapesního jídla',
      detail: 'Gely, rice cakes, izotonické nápoje připraveny',
    },
    {
      id: 'banana_isotonic', hoursOffset: -0.75, checked: false,
      label: 'Banán + izotonický nápoj',
      detail: '45 minut před startem',
    },
    {
      id: 'warmup', hoursOffset: -0.33, checked: false,
      label: 'Rozjetí Z1',
      detail: '20 minut lehkého zahřátí',
    },
    {
      id: 'pre_start', hoursOffset: -0.083, checked: false,
      label: '200 ml izotoniku',
      detail: '5 minut před startem',
    },
  ].map(item => ({
    ...item,
    detail: `${item.detail} (${formatOffset(item.hoursOffset, raceStartHour, raceStartMinute)})`,
  }));
}

function formatOffset(hoursOffset: number, startH: number, startM: number): string {
  const totalMinutes = startH * 60 + startM + hoursOffset * 60;
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  const hh = String(Math.max(0, h)).padStart(2, '0');
  const mm = String(Math.max(0, m)).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function useRaceWeek(
  userId: string | undefined,
  nextRace: RaceEvent | null,
): UseRaceWeekResult {
  const [onBikeEntries, setOnBikeEntries] = useState<OnBikeEntry[]>([]);
  const [loading, setLoading]             = useState(false);
  const [raceStartHour, setRaceStartHour]     = useState(10);
  const [raceStartMinute, setRaceStartMinute] = useState(0);
  const [morningChecklist, setMorningChecklist] = useState<RaceMorningItem[]>(() =>
    buildMorningChecklist(10, 0),
  );

  const todayISO = formatLocalISODate(new Date());
  const daysToRace = nextRace
    ? Math.round(
        (new Date(`${nextRace.race_date}T00:00:00`).getTime() - new Date(`${todayISO}T00:00:00`).getTime())
        / (24 * 60 * 60 * 1000),
      )
    : null;

  const isRaceDay    = daysToRace === 0;
  const isCarbLoading = daysToRace != null && daysToRace >= 1 && daysToRace <= 2;

  const load = useCallback(async () => {
    if (!userId || !nextRace) return;
    setLoading(true);
    const { data } = await supabase
      .from('on_bike_nutrition_log')
      .select('*')
      .eq('user_id', userId)
      .eq('race_event_id', nextRace.id)
      .order('timestamp', { ascending: true });
    if (data) setOnBikeEntries(data as OnBikeEntry[]);
    setLoading(false);
  }, [userId, nextRace]);

  useEffect(() => { load(); }, [load]);

  // Rebuild checklist při změně startu
  useEffect(() => {
    setMorningChecklist(buildMorningChecklist(raceStartHour, raceStartMinute));
  }, [raceStartHour, raceStartMinute]);

  const toggleMorningItem = (id: string) => {
    setMorningChecklist(prev =>
      prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item),
    );
  };

  const addOnBikeEntry = async (entry: Omit<OnBikeEntry, 'id' | 'user_id'>): Promise<void> => {
    if (!userId) return;
    const { data } = await supabase
      .from('on_bike_nutrition_log')
      .insert({ ...entry, user_id: userId })
      .select()
      .single();
    if (data) setOnBikeEntries(prev => [...prev, data as OnBikeEntry]);
  };

  const setRaceStartTime = (hour: number, minute: number) => {
    setRaceStartHour(hour);
    setRaceStartMinute(minute);
  };

  const totalOnBikeCarbs = onBikeEntries.reduce((s, e) => s + e.carbs_g, 0);
  const totalOnBikeKcal  = onBikeEntries.reduce((s, e) => s + e.kcal, 0);

  return {
    race: nextRace,
    daysToRace,
    isCarbLoading,
    isRaceDay,
    morningChecklist,
    toggleMorningItem,
    onBikeEntries,
    addOnBikeEntry,
    totalOnBikeCarbs,
    totalOnBikeKcal,
    raceStartHour,
    raceStartMinute,
    setRaceStartTime,
    loading,
    reload: load,
  };
}
