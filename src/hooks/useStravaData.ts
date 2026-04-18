import { useState, useEffect, useCallback } from 'react';
import {
  loadStravaTokens, clearStravaTokens,
  fetchStravaActivities, type StravaActivity,
} from '../services/stravaService';

const CACHE_KEY    = 'cyclofuel_strava_cache';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

interface StravaCache {
  activities: StravaActivity[];
  daysBack:   number;
  fetchedAt:  number;
}

function loadCache(daysBack: number): StravaCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as StravaCache;
    if (c.daysBack !== daysBack) return null;
    if (Date.now() - c.fetchedAt > CACHE_TTL_MS) return null;
    return c;
  } catch { return null; }
}

function saveCache(activities: StravaActivity[], daysBack: number) {
  const c: StravaCache = { activities, daysBack, fetchedAt: Date.now() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(c));
}

export interface UseStravaResult {
  activities:   StravaActivity[];
  loading:      boolean;
  error:        string | null;
  stale:        boolean;
  isConnected:  boolean;
  cacheAge:     string | null;
  sync:         () => Promise<void>;
  disconnect:   () => void;
}

export function useStravaData(daysBack = 3): UseStravaResult {
  const isConnected = !!loadStravaTokens();

  const [activities, setActivities] = useState<StravaActivity[]>(
    () => loadCache(daysBack)?.activities ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [stale,   setStale]   = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(
    () => loadCache(daysBack)?.fetchedAt ?? null,
  );
  const [connected, setConnected] = useState(isConnected);

  const sync = useCallback(async () => {
    if (!loadStravaTokens()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStravaActivities(daysBack);
      saveCache(data, daysBack);
      setActivities(data);
      setFetchedAt(Date.now());
      setStale(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Chyba při načítání Strava dat';
      setError(msg);
      setStale(true);
    } finally {
      setLoading(false);
    }
  }, [daysBack]);

  const disconnect = useCallback(() => {
    clearStravaTokens();
    localStorage.removeItem(CACHE_KEY);
    setConnected(false);
    setActivities([]);
    setError(null);
    setStale(false);
    setFetchedAt(null);
  }, []);

  // Auto-sync on mount if cache is empty or expired
  useEffect(() => {
    if (!loadStravaTokens()) return;
    const cached = loadCache(daysBack);
    if (!cached) sync();
  }, [daysBack, sync]);

  const cacheAge = fetchedAt
    ? (() => {
        const diff = Math.round((Date.now() - fetchedAt) / 60_000);
        if (diff < 1)  return 'Právě teď';
        if (diff < 60) return `Před ${diff} min`;
        return `Před ${Math.floor(diff / 60)} h`;
      })()
    : null;

  return { activities, loading, error, stale, isConnected: connected, cacheAge, sync, disconnect };
}
