import { useCallback, useEffect, useRef, useState } from 'react';
import { dbMaybeSingle, dbUpsert } from '../lib/dbClient';

const USER_SETTING_EVENT = 'cyclofuel-user-setting-updated';

interface UseUserSettingOptions<T> {
  legacyKey?: string;
  persistLegacy?: boolean;
  isEmpty?: (value: T) => boolean;
}

function readLegacyValue<T>(legacyKey: string | undefined, fallback: T): T {
  if (!legacyKey) return fallback;
  try {
    const raw = localStorage.getItem(legacyKey);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      if (typeof fallback === 'number') return Number(raw) as T;
      if (typeof fallback === 'boolean') return (raw === 'true') as T;
      if (typeof fallback === 'string') return raw as T;
      return fallback;
    }
  } catch {
    return fallback;
  }
}

function writeLegacyValue<T>(legacyKey: string | undefined, value: T) {
  if (!legacyKey) return;
  try {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      localStorage.setItem(legacyKey, String(value));
      return;
    }
    localStorage.setItem(legacyKey, JSON.stringify(value));
  } catch {
    // ignore quota/private mode
  }
}

const settingCache = new Map<string, unknown>();
const settingInflight = new Map<string, Promise<unknown>>();

function settingCacheKey(userId: string, key: string) {
  return `${userId}:${key}`;
}

export async function fetchUserSetting<T>(userId: string, key: string, fallback: T): Promise<T> {
  const cacheKey = settingCacheKey(userId, key);
  if (settingCache.has(cacheKey)) return (settingCache.get(cacheKey) as T) ?? fallback;

  const existing = settingInflight.get(cacheKey);
  if (existing) return ((await existing) as T) ?? fallback;

  const request = Promise.resolve(
    dbMaybeSingle<{ value: T }>('user_settings', {
      columns: ['value'],
      where: { user_id: userId, key },
    }),
  )
    .then(data => {
      const value = !data ? fallback : ((data.value as T) ?? fallback);
      settingCache.set(cacheKey, value);
      return value;
    })
    .finally(() => {
      settingInflight.delete(cacheKey);
    });

  settingInflight.set(cacheKey, request);
  return request;
}

export function useUserSetting<T>(
  userId: string | undefined,
  key: string,
  fallback: T,
  options?: UseUserSettingOptions<T>,
) {
  const { legacyKey, persistLegacy = true, isEmpty } = options ?? {};
  const legacyValue = readLegacyValue(legacyKey, fallback);
  const [value, setValue] = useState<T>(legacyValue);
  const [loading, setLoading] = useState(false);
  const fallbackRef = useRef(fallback);
  const isEmptyRef = useRef(isEmpty);

  fallbackRef.current = fallback;
  isEmptyRef.current = isEmpty;

  useEffect(() => {
    const currentFallback = fallbackRef.current;
    const currentLegacyValue = readLegacyValue(legacyKey, currentFallback);

    if (!userId) {
      setValue(currentLegacyValue);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const remoteValue = await fetchUserSetting(userId, key, currentFallback);
      if (cancelled) return;

      const emptyCheck = isEmptyRef.current;
      const remoteIsEmpty = emptyCheck ? emptyCheck(remoteValue) : false;
      const legacyIsMeaningful = emptyCheck
        ? !emptyCheck(currentLegacyValue)
        : currentLegacyValue !== currentFallback;

      if (remoteIsEmpty && legacyIsMeaningful) {
        setValue(currentLegacyValue);
        settingCache.set(settingCacheKey(userId, key), currentLegacyValue);
        await dbUpsert('user_settings', { user_id: userId, key, value: currentLegacyValue }, ['user_id', 'key']);
      } else {
        setValue(remoteValue);
        if (persistLegacy) writeLegacyValue(legacyKey, remoteValue);
      }

      if (!cancelled) setLoading(false);
    };

    void load();

    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; key: string; value: T }>).detail;
      if (detail?.userId === userId && detail?.key === key) {
        setValue(detail.value);
      }
    };

    window.addEventListener(USER_SETTING_EVENT, onUpdated as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener(USER_SETTING_EVENT, onUpdated as EventListener);
    };
  }, [userId, key, legacyKey, persistLegacy]);

  const saveValue = useCallback(async (next: T) => {
    setValue(next);
    if (persistLegacy) writeLegacyValue(legacyKey, next);
    if (!userId) return;

    settingCache.set(settingCacheKey(userId, key), next);
    await dbUpsert('user_settings', { user_id: userId, key, value: next }, ['user_id', 'key']);

    window.dispatchEvent(new CustomEvent(USER_SETTING_EVENT, {
      detail: { userId, key, value: next },
    }));
  }, [userId, key, legacyKey, persistLegacy]);

  return { value, setValue: saveValue, loading };
}
