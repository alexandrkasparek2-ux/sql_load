import { useState, useEffect, useCallback } from 'react';
import { dbMaybeSingle, dbUpdate } from '../lib/dbClient';

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
    const data = await dbMaybeSingle<Profile>('profiles', {
      columns: ['id', 'weight', 'height', 'age', 'gender'],
      where: { id: userId },
    });
    if (data) setProfile(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const save = async (updates: Partial<Omit<Profile, 'id'>>): Promise<void> => {
    if (!userId) return;
    const [data] = await dbUpdate<Profile>('profiles', updates, { id: userId });
    if (data) setProfile(data);
  };

  return { profile, loading, save, reload: load };
}
