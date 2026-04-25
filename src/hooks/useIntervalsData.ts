import { useState, useEffect, useCallback } from 'react';
import {
  loadCreds, clearCreds, saveCreds,
  fetchIntervalsActivities, saveBurnLog,
  type IntervalsActivity, type IntervalsCreds,
} from '../services/intervalsService';
import { getSetting, setSetting, deleteSetting } from './useUserSettings';

const CACHE_KEY    = 'cyclofuel_intervals_cache';
const CACHE_TTL_MS = 15 * 60 * 1000;

interface Cache {
  activities: IntervalsActivity[];
  daysBack:   number;
  fetchedAt:  number;
}

function loadCache(daysBack: number): Cache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cache;
    if (c.daysBack !== daysBack) return null;
    if (Date.now() - c.fetchedAt > CACHE_TTL_MS) return null;
    return c;
  } catch { return null; }
}

function saveCache(activities: IntervalsActivity[], daysBack: number) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ activities, daysBack, fetchedAt: Date.now() }));
  window.dispatchEvent(new CustomEvent('intervals-cache-updated'));
}

export interface UseIntervalsResult {
  activities:  IntervalsActivity[];
  loading:     boolean;
  error:       string | null;
  stale:       boolean;
  isConnected: boolean;
  cacheAge:    string | null;
  connect:     (creds: IntervalsCreds) => Promise<void>;
  sync:        () => Promise<void>;
  disconnect:  () => void;
}

export function useIntervalsData(daysBack = 3, userId?: string): UseIntervalsResult {
  const [creds,      setCreds]      = useState<IntervalsCreds | null>(() => loadCreds());
  const [activities, setActivities] = useState<IntervalsActivity[]>(
    () => loadCache(daysBack)?.activities ?? [],
  );
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [stale,      setStale]      = useState(false);
  const [fetchedAt,  setFetchedAt]  = useState<number | null>(
    () => loadCache(daysBack)?.fetchedAt ?? null,
  );

  // On mount: pull credentials from Supabase if not in localStorage
  useEffect(() => {
    if (!userId || loadCreds()) return;
    getSetting<IntervalsCreds>(userId, 'intervals_creds').then(remote => {
      if (remote) { saveCreds(remote); setCreds(remote); }
    });
  }, [userId]);

  const sync = useCallback(async (c?: IntervalsCreds) => {
    const activeCreds = c ?? loadCreds();
    if (!activeCreds) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchIntervalsActivities(activeCreds, daysBack);
      saveCache(data, daysBack);
      saveBurnLog(data);
      setActivities(data);
      setFetchedAt(Date.now());
      setStale(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba načítání');
      setStale(true);
    } finally {
      setLoading(false);
    }
  }, [daysBack]);

  const connect = useCallback(async (newCreds: IntervalsCreds) => {
    saveCreds(newCreds);
    setCreds(newCreds);
    if (userId) setSetting(userId, 'intervals_creds', newCreds);
    await sync(newCreds);
  }, [sync, userId]);

  const disconnect = useCallback(() => {
    clearCreds();
    localStorage.removeItem(CACHE_KEY);
    if (userId) deleteSetting(userId, 'intervals_creds');
    setCreds(null);
    setActivities([]);
    setError(null);
    setStale(false);
    setFetchedAt(null);
  }, [userId]);

  // Auto-sync on mount if cache stale
  useEffect(() => {
    const c = loadCreds();
    if (!c) return;
    if (!loadCache(daysBack)) sync(c);
  }, [daysBack, sync]);

  const cacheAge = fetchedAt
    ? (() => {
        const diff = Math.round((Date.now() - fetchedAt) / 60_000);
        if (diff < 1)  return 'Právě teď';
        if (diff < 60) return `Před ${diff} min`;
        return `Před ${Math.floor(diff / 60)} h`;
      })()
    : null;

  return {
    activities, loading, error, stale,
    isConnected: !!creds,
    cacheAge, connect, sync, disconnect,
  };
}
