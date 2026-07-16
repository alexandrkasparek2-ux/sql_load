import { useState, useEffect, useCallback } from 'react';
import { loadTokens, fetchWhoopHistory, type WhoopHistory } from '../services/whoopService';

const CACHE_KEY    = 'cyclofuel_whoop_history_cache';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 h — trend data doesn't need to be fresh-to-the-minute

interface HistoryCache { days: number; data: WhoopHistory; cachedAt: number; }

function loadCache(days: number): HistoryCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as HistoryCache;
    if (c.days !== days) return null;
    if (Date.now() - c.cachedAt > CACHE_TTL_MS) return null;
    return c;
  } catch { return null; }
}

function saveCache(days: number, data: WhoopHistory) {
  const c: HistoryCache = { days, data, cachedAt: Date.now() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(c));
}

export function useWhoopHistory(days: number) {
  const isConnected = !!loadTokens();

  const [data,    setData]    = useState<WhoopHistory | null>(() => loadCache(days)?.data ?? null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const sync = useCallback(async () => {
    if (!loadTokens()) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await fetchWhoopHistory(days);
      setData(fresh);
      saveCache(days, fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (!loadTokens()) return;
    if (!loadCache(days)) sync();
  }, [days, sync]);

  return { data, loading, error, isConnected, sync };
}
