import { useState, useEffect, useCallback } from 'react';
import {
  isAppleHealthAvailable,
  requestAppleHealthAuth,
  fetchAppleHealthData,
  loadAppleHealthCache,
  clearAppleHealthCache,
  type AppleHealthData,
} from '../services/appleHealthService';

const AUTH_KEY = 'cyclofuel_apple_health_authorized';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

function isCacheStale(data: AppleHealthData): boolean {
  return Date.now() - new Date(data.fetchedAt).getTime() > CACHE_TTL_MS;
}

export interface UseAppleHealthResult {
  data:         AppleHealthData | null;
  loading:      boolean;
  error:        string | null;
  stale:        boolean;
  isAvailable:  boolean;
  isAuthorized: boolean;
  cacheAge:     string | null;
  authorize:    () => Promise<void>;
  sync:         () => Promise<void>;
  disconnect:   () => void;
}

export function useAppleHealth(): UseAppleHealthResult {
  const isAvailable  = isAppleHealthAvailable();
  const [isAuthorized, setIsAuthorized] = useState(() =>
    localStorage.getItem(AUTH_KEY) === '1',
  );
  const [data,    setData]    = useState<AppleHealthData | null>(() => loadAppleHealthCache());
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [stale,   setStale]   = useState(() => {
    const cached = loadAppleHealthCache();
    return cached ? isCacheStale(cached) : false;
  });

  const sync = useCallback(async () => {
    if (!isAvailable) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await fetchAppleHealthData();
      setData(fresh);
      setStale(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Chyba při načítání Apple Health dat';
      setError(msg);
      // Keep cached data if available
      const cached = loadAppleHealthCache();
      if (cached) setStale(true);
    } finally {
      setLoading(false);
    }
  }, [isAvailable]);

  const authorize = useCallback(async () => {
    if (!isAvailable) return;
    setLoading(true);
    setError(null);
    try {
      await requestAppleHealthAuth();
      localStorage.setItem(AUTH_KEY, '1');
      setIsAuthorized(true);
      // Fetch data right after authorizing
      const fresh = await fetchAppleHealthData();
      setData(fresh);
      setStale(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Chyba při autorizaci Apple Health';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isAvailable]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    clearAppleHealthCache();
    setIsAuthorized(false);
    setData(null);
    setError(null);
    setStale(false);
  }, []);

  // Auto-sync on mount if authorized and cache is stale or empty
  useEffect(() => {
    if (!isAvailable || !isAuthorized) return;
    const cached = loadAppleHealthCache();
    if (!cached || isCacheStale(cached)) {
      sync();
    }
  }, [isAvailable, isAuthorized, sync]);

  // Format cache age
  const cacheAge = data
    ? (() => {
        const diffMs  = Date.now() - new Date(data.fetchedAt).getTime();
        const diffMin = Math.round(diffMs / 60_000);
        if (diffMin < 1)  return 'Právě teď';
        if (diffMin < 60) return `Před ${diffMin} min`;
        const h = Math.floor(diffMin / 60);
        return `Před ${h} h`;
      })()
    : null;

  return { data, loading, error, stale, isAvailable, isAuthorized, cacheAge, authorize, sync, disconnect };
}
