import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Generic key-value settings synced to Supabase user_settings table.
// Falls back gracefully if table doesn't exist or user is offline.

export async function getSetting<T>(userId: string, key: string): Promise<T | null> {
  try {
    const { data } = await supabase
      .from('user_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', key)
      .single();
    return data ? (data.value as T) : null;
  } catch { return null; }
}

export async function setSetting(userId: string, key: string, value: unknown): Promise<void> {
  try {
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() });
  } catch { /* offline — ignore */ }
}

export async function deleteSetting(userId: string, key: string): Promise<void> {
  try {
    await supabase.from('user_settings').delete().eq('user_id', userId).eq('key', key);
  } catch { /* ignore */ }
}

// Loads all settings for a user as a record
export async function getAllSettings(userId: string): Promise<Record<string, unknown>> {
  try {
    const { data } = await supabase
      .from('user_settings')
      .select('key, value')
      .eq('user_id', userId);
    if (!data) return {};
    return Object.fromEntries(data.map(r => [r.key, r.value]));
  } catch { return {}; }
}

// Hook wrapper for component-level use
export function useUserSettings(userId: string) {
  const get = useCallback(<T>(key: string) => getSetting<T>(userId, key), [userId]);
  const set = useCallback((key: string, value: unknown) => setSetting(userId, key, value), [userId]);
  const del = useCallback((key: string) => deleteSetting(userId, key), [userId]);
  return { get, set, del };
}
