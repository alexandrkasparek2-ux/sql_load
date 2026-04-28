import { useState, useEffect, useCallback } from 'react';
import {
  fetchTPPlan, loadTPCache, loadTPUrl, saveTPUrl, clearTPCache,
  type PlannedWorkout,
} from '../services/trainingPeaksService';

export type { PlannedWorkout };

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

  const todayWorkout = workouts.find(w => w.date === today) ?? null;
  const upcoming     = workouts.filter(w => w.date >= today);

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
