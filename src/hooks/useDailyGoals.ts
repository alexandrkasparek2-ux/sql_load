import { useCallback } from 'react';
import { fetchUserSetting, useUserSetting } from './useUserSetting';

const LS_KEY = 'cyclofuel_daily_goals';
const SETTING_KEY = 'daily_goals';
const EMPTY_GOALS: Record<string, number> = {};

export async function loadDailyGoals(userId: string | undefined): Promise<Record<string, number>> {
  if (!userId) {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
    } catch {
      return {};
    }
  }
  return fetchUserSetting<Record<string, number>>(userId, SETTING_KEY, EMPTY_GOALS);
}

export function useDailyGoals(userId: string | undefined) {
  const { value: goalsByDate, setValue: setGoalsByDate } = useUserSetting<Record<string, number>>(
    userId,
    SETTING_KEY,
    EMPTY_GOALS,
    {
      legacyKey: LS_KEY,
      isEmpty: value => Object.keys(value).length === 0,
    },
  );

  const saveGoalForDate = useCallback(async (date: string, kcal: number) => {
    if (!date || kcal <= 0) return;

    const next = { ...goalsByDate };
    const rounded = Math.round(kcal);
    if (next[date] === rounded) return;
    next[date] = rounded;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
    for (const key of Object.keys(next)) {
      if (key < cutoffStr) delete next[key];
    }

    await setGoalsByDate(next);
  }, [goalsByDate, setGoalsByDate]);

  return { saveGoalForDate, goalsByDate };
}
