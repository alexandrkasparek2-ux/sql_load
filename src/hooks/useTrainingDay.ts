import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { TrainingType } from '../constants/training';

export type ActivityIntensity = 'low' | 'medium' | 'high';

export interface TrainingDay {
  id?:                 string;
  user_id:             string;
  date:                string;
  training_type:       TrainingType;
  extra_types:         TrainingType[];
  activity_hours:      Record<string, number>;
  activity_intensity:  Record<string, ActivityIntensity>;
  ride_hours:          number;
  water_glasses:       number;
  coffee_cups:         number;
}

const defaultDay = (userId: string, date: string): TrainingDay => ({
  user_id:             userId,
  date,
  training_type:       'rest',
  extra_types:         [],
  activity_hours:      {},
  activity_intensity:  {},
  ride_hours:          0,
  water_glasses:       0,
  coffee_cups:         0,
});

export function useTrainingDay(userId: string | undefined, date: string) {
  const [trainingDay, setTrainingDay] = useState<TrainingDay | null>(null);
  const [loading, setLoading]         = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('training_days')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();
    setTrainingDay(data ?? defaultDay(userId, date));
    setLoading(false);
  }, [userId, date]);

  useEffect(() => { load(); }, [load]);

  const upsert = async (updates: Partial<TrainingDay>): Promise<void> => {
    if (!userId) return;
    const current = trainingDay ?? defaultDay(userId, date);
    const payload = {
      user_id:             userId,
      date,
      training_type:       current.training_type,
      extra_types:         current.extra_types,
      activity_hours:      current.activity_hours,
      activity_intensity:  current.activity_intensity,
      ride_hours:          current.ride_hours,
      water_glasses:       current.water_glasses,
      coffee_cups:         current.coffee_cups,
      ...updates,
    };
    const { data, error } = await supabase
      .from('training_days')
      .upsert(payload, { onConflict: 'user_id,date' })
      .select('*')
      .single();
    if (!error && data) setTrainingDay(data as TrainingDay);
    else setTrainingDay(prev => prev ? { ...prev, ...updates } : payload as TrainingDay);
  };

  return { trainingDay, loading, upsert };
}
