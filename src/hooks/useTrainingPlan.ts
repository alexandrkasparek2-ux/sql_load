import { useState, useEffect, useCallback } from 'react';
import {
  fetchTPPlan, loadTPCache, loadTPUrl, saveTPUrl, clearTPCache,
  TP_FORCE_SYNC_EVENT,
  type PlannedWorkout,
} from '../services/trainingPeaksService';

export type { PlannedWorkout };

// Cycling > running > other > walking/hiking/yoga — determines which workout
// is shown as "today's primary" when multiple workouts exist on the same day.
const SPORT_PRIORITY: Record<string, number> = {
  hard: 0, race: 1, medium: 2, light: 3, cycling_indoor: 4,
  running: 5, swimming: 6, strength: 7, walking: 8, hiking: 9,
  yoga: 10, skiing: 11,
};
function sportPriority(type: string): number {
  return SPORT_PRIORITY[type] ?? 99;
}

export function useTrainingPlan() {
  const [icalUrl,  setIcalUrlState] = useState(() => loadTPUrl());
  const [workouts, setWorkouts]     = useState<PlannedWorkout[]>(() => loadTPCache());
  const [loading,  setLoading]      = useState(false);
  const [error,    setError]        = useState<string | null>(null);
  const [syncedAt, setSyncedAt]     = useState<number | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const sync = useCallback(async (url?: string) => {
    const u = (url ?? icalUrl).trim();
    if (!u) return;
    setLoading(true);
    setError(null);
    try {
      const w = await fetchTPPlan(u);
      setWorkouts(w);
      setSyncedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [icalUrl]);

  const saveUrl = useCallback((url: string) => {
    saveTPUrl(url);
    setIcalUrlState(url.trim());
    clearTPCache();
    setWorkouts([]);
  }, []);

  const disconnect = useCallback(() => {
    saveTPUrl('');
    clearTPCache();
    setIcalUrlState('');
    setWorkouts([]);
    setError(null);
  }, []);

  // Auto-sync on mount if URL set and cache is empty
  useEffect(() => {
    if (icalUrl && workouts.length === 0) {
      sync();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Force sync when header SYNC button dispatches the event
  useEffect(() => {
    const handler = () => {
      if (!icalUrl) return;
      clearTPCache();
      setWorkouts([]);
      sync();
    };
    window.addEventListener(TP_FORCE_SYNC_EVENT, handler);
    return () => window.removeEventListener(TP_FORCE_SYNC_EVENT, handler);
  }, [icalUrl, sync]);

  const todayWorkout = workouts
    .filter(w => w.date === today)
    .sort((a, b) => sportPriority(a.sportType) - sportPriority(b.sportType))[0] ?? null;

  const upcoming = workouts
    .filter(w => w.date >= today)
    .sort((a, b) =>
      a.date !== b.date
        ? a.date.localeCompare(b.date)
        : sportPriority(a.sportType) - sportPriority(b.sportType),
    );

  return {
    workouts,
    upcoming,
    todayWorkout,
    loading,
    error,
    icalUrl,
    isConnected: !!icalUrl,
    syncedAt,
    saveUrl,
    sync,
    disconnect,
  };
}
