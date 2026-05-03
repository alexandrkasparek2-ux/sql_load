import { useState, useEffect, useCallback, useRef } from 'react';
import {
  type DailySnapshot,
  saveSnapshot,
  loadSnapshot,
  deleteSnapshot,
} from '../services/dailySnapshotService';

export type { DailySnapshot };

export interface UseDailyNutritionSnapshotReturn {
  snapshot:              DailySnapshot | null;
  loading:               boolean;
  /** Whether this date has a frozen snapshot (i.e. it's a past day). */
  isHistoricalSnapshot:  boolean;
  /** Persist the current day's calculated state. */
  saveSnapshot:          (data: Omit<DailySnapshot, 'user_id' | 'date' | 'updated_at'>) => Promise<void>;
  /** Clear snapshot and return to live calculation. */
  clearSnapshot:         () => Promise<void>;
}

/**
 * useDailyNutritionSnapshot
 *
 * Loads (and lets you save/clear) the persistent snapshot for a given
 * user + date.  For today, the snapshot is written on every data change
 * (debounced by the caller).  For past dates, the snapshot is read-only
 * unless the user explicitly clicks "Přepočítat den".
 */
export function useDailyNutritionSnapshot(
  userId: string | undefined,
  date:   string,
): UseDailyNutritionSnapshotReturn {
  const [snapshot, setSnapshot] = useState<DailySnapshot | null>(null);
  const [loading,  setLoading]  = useState(false);

  const realToday = useRef(new Date().toISOString().split('T')[0]).current;
  const isHistoricalSnapshot = date < realToday && snapshot !== null;

  // ── Load on mount and when date/userId change ──────────────────────────────
  useEffect(() => {
    if (!userId) { setSnapshot(null); return; }
    let cancelled = false;
    setLoading(true);
    loadSnapshot(userId, date).then(snap => {
      if (!cancelled) { setSnapshot(snap); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [userId, date]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = useCallback(
    async (data: Omit<DailySnapshot, 'user_id' | 'date' | 'updated_at'>) => {
      if (!userId) return;
      const snap: DailySnapshot = {
        user_id:    userId,
        date,
        updated_at: new Date().toISOString(),
        ...data,
      };
      setSnapshot(snap);             // optimistic update
      await saveSnapshot(snap);
    },
    [userId, date],
  );

  // ── Clear (force recalculation) ────────────────────────────────────────────
  const clear = useCallback(async () => {
    if (!userId) return;
    setSnapshot(null);
    await deleteSnapshot(userId, date);
  }, [userId, date]);

  return {
    snapshot,
    loading,
    isHistoricalSnapshot,
    saveSnapshot: save,
    clearSnapshot: clear,
  };
}
