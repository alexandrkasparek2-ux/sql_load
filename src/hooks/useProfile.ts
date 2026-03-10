import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Profile {
  id:     string;
  weight: number;
  height: number;
  age:    number;
  gender: 'male' | 'female';
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, weight, height, age, gender')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as Profile);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const save = async (updates: Partial<Omit<Profile, 'id'>>): Promise<void> => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('id, weight, height, age, gender')
      .single();
    if (!error && data) setProfile(data as Profile);
  };

  return { profile, loading, save, reload: load };
}
