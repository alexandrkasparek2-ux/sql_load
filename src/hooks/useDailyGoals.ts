import { useCallback } from 'react';

// ─── Daily calorie goals ────────────────────────────────────
// Stores the calorie goal for each date so the history chart
// can show the correct goal bar per day (e.g. hard training day
// has a higher goal than a rest day).
// Format: { "2026-03-15": 3200, "2026-03-14": 2000, ... }

const LS_KEY = 'cyclofuel_daily_goals';

export function loadDailyGoals(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function useDailyGoals() {
  const saveGoalForDate = useCallback((date: string, kcal: number) => {
    if (!date || kcal <= 0) return;
    const stored = loadDailyGoals();
    // Only update if the value actually changed (avoids unnecessary writes)
    if (stored[date] === Math.round(kcal)) return;
    stored[date] = Math.round(kcal);
    // Keep only last 60 days to avoid unbounded growth
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    for (const key of Object.keys(stored)) {
      if (key < cutoffStr) delete stored[key];
    }
    localStorage.setItem(LS_KEY, JSON.stringify(stored));
  }, []);

  return { saveGoalForDate };
}
