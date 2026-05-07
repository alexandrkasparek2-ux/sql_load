import { useState, useEffect, useCallback } from 'react';
import {
  loadTokens, fetchWhoopData, clearTokens,
  type WhoopData,
} from '../services/whoopService';

const CACHE_KEY = 'cyclofuel_whoop_cache';

function localDateStr(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function loadCache(): (WhoopData & { cachedAt: number }) | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveCache(data: WhoopData) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, cachedAt: Date.now() }));
}

function isCacheStale(cache: { cachedAt: number } | null): boolean {
  if (!cache) return true;
  // Stale if from a different calendar day
  if (localDateStr(cache.cachedAt) !== localDateStr(Date.now())) return true;
  // Also stale if older than 4 hours within the same day
  return Date.now() - cache.cachedAt > 4 * 60 * 60 * 1000;
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
      // Only clear tokens on explicit re-auth errors — never on network/server errors
      if (msg.includes('re-authenticate')) {
        clearTokens();
      }
      // Always fall back to cache
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

  // Auto-sync on mount if cache is stale (different day or > 4 h)
  useEffect(() => {
    if (!loadTokens()) return;
    if (isCacheStale(loadCache())) {
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
