import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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

export async function fetchUserSetting<T>(userId: string, key: string, fallback: T): Promise<T> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('value')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();

  if (error || !data) return fallback;
  return (data.value as T) ?? fallback;
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

  useEffect(() => {
    if (!userId) {
      setValue(legacyValue);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const remoteValue = await fetchUserSetting(userId, key, fallback);
      if (cancelled) return;

      const remoteIsEmpty = isEmpty ? isEmpty(remoteValue) : false;
      const legacyIsMeaningful = isEmpty ? !isEmpty(legacyValue) : legacyValue !== fallback;

      if (remoteIsEmpty && legacyIsMeaningful) {
        setValue(legacyValue);
        await supabase.from('user_settings').upsert(
          { user_id: userId, key, value: legacyValue },
          { onConflict: 'user_id,key' },
        );
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
  }, [userId, key, fallback, legacyKey, persistLegacy, isEmpty, legacyValue]);

  const saveValue = useCallback(async (next: T) => {
    setValue(next);
    if (persistLegacy) writeLegacyValue(legacyKey, next);
    if (!userId) return;

    await supabase.from('user_settings').upsert(
      { user_id: userId, key, value: next },
      { onConflict: 'user_id,key' },
    );

    window.dispatchEvent(new CustomEvent(USER_SETTING_EVENT, {
      detail: { userId, key, value: next },
    }));
  }, [userId, key, legacyKey, persistLegacy]);

  return { value, setValue: saveValue, loading };
}
