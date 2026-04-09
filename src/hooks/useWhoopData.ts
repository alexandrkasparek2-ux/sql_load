import { useState, useEffect, useCallback } from 'react';
import {
  loadTokens, fetchWhoopData, clearTokens,
  type WhoopData,
} from '../services/whoopService';

const CACHE_KEY    = 'cyclofuel_whoop_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

function loadCache(): (WhoopData & { cachedAt: number }) | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch { return null; }
}

function saveCache(data: WhoopData) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, cachedAt: Date.now() }));
}

export function useWhoopData() {
  const isConnected = !!loadTokens();

  const [data,    setData]    = useState<WhoopData | null>(() => {
    const c = loadCache();
    return c ?? null;
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [stale,   setStale]   = useState(false);

  const sync = useCallback(async () => {
    if (!loadTokens()) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await fetchWhoopData();
      setData(fresh);
      saveCache(fresh);
      setStale(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      // If auth error, mark as stale
      if (msg.includes('re-authenticate') || msg.includes('Not connected')) {
        clearTokens();
      }
      // Use cache as fallback
      const cached = loadCache();
      if (cached) {
        setData(cached);
        setStale(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    clearTokens();
    localStorage.removeItem(CACHE_KEY);
    setData(null);
    setError(null);
  }, []);

  // Auto-sync on mount and when cache is stale (> 30 min)
  useEffect(() => {
    if (!loadTokens()) return;
    const cached = loadCache();
    const age    = cached ? Date.now() - cached.cachedAt : Infinity;
    if (age > CACHE_TTL_MS) {
      sync();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cacheAge = (() => {
    const c = loadCache();
    if (!c) return null;
    const mins = Math.round((Date.now() - c.cachedAt) / 60_000);
    if (mins < 1)  return 'Právě aktualizováno';
    if (mins < 60) return `Před ${mins} min`;
    const hrs = Math.round(mins / 60);
    return `Před ${hrs} h`;
  })();

  return {
    data,
    loading,
    error,
    stale,
    isConnected,
    cacheAge,
    sync,
    disconnect,
  };
}
