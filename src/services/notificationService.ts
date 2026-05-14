// ============================================================
// notificationService.ts
// Správa push notifikací pro CycloFuel — používá Web Notifications API.
// Zahrnuje notifikace pro každou tréninkovou fázi, race week,
// závodní ráno a on-bike timing připomínky.
// ============================================================

import type { TrainingPhase } from './phaseDetectionService';

// ── Oprávnění ─────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function canNotify(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

// ── Základní funkce pro odeslání notifikace ──────────────
function sendNotification(title: string, body: string, tag?: string, icon?: string): void {
  if (!canNotify()) return;
  try {
    new Notification(title, {
      body,
      tag:  tag ?? 'cyclofuel',
      icon: icon ?? '/icon-192.png',
      badge: '/icon-192.png',
    });
  } catch {
    // Notifikace selhaly (např. v iframu nebo bez SW)
  }
}

// ── Naplánování notifikace na konkrétní čas ───────────────
// Vrací timeoutId pro případné zrušení
export function scheduleNotification(
  delayMs: number,
  title: string,
  body: string,
  tag?: string,
): ReturnType<typeof setTimeout> {
  return setTimeout(() => sendNotification(title, body, tag), delayMs);
}

// ── Off Season notifikace ─────────────────────────────────
export function notifyOffSeasonDeficitWarning(currentDeficitKcal: number): void {
  if (Math.abs(currentDeficitKcal) > 300) {
    sendNotification(
      '⚠️ Příliš velký deficit!',
      `Deficit ${Math.round(Math.abs(currentDeficitKcal))} kcal. Riziko ztráty svalové hmoty.`,
      'deficit-warning',
    );
  }
}

export function notifyOffSeasonWeeklySummary(avgKcal: number, weightTrend: string): void {
  sendNotification(
    '📊 Týdenní souhrn výživy',
    `Průměr ${Math.round(avgKcal)} kcal · Váhový trend: ${weightTrend}`,
    'weekly-summary',
  );
}

// ── Build notifikace ──────────────────────────────────────
export function notifyBuildCarbsReminder(missingCarbsG: number): void {
  sendNotification(
    '🚴 Ještě potřebuješ sacharidy!',
    `Do cíle zbývá ${Math.round(missingCarbsG)} g sacharidů. Doplň to večeří.`,
    'carbs-reminder',
  );
}

export function notifyPostWorkoutWindow(proteinG: number, carbsG: number): void {
  sendNotification(
    '💪 Regenerační okno!',
    `Sněz do 30 min: ${Math.round(proteinG)} g bílkovin + ${Math.round(carbsG)} g sacharidů`,
    'post-workout',
  );
}

export function notifyLowSleepProteinBoost(): void {
  sendNotification(
    '😴 Málo spánku — zvyš protein',
    'Méně než 7h spánku. Zvyš protein o 20 % dnešní den pro lepší regeneraci.',
    'sleep-protein',
  );
}

// ── Race Week notifikace ──────────────────────────────────
export function notifyCarbLoadingProgress(currentG: number, targetG: number): void {
  sendNotification(
    '🍝 Carb-loading update',
    `Sacharidy: ${Math.round(currentG)} g z ${Math.round(targetG)} g`,
    'carb-loading',
  );
}

export function notifyRaceEveNightReminder(): void {
  sendNotification(
    '🏁 Zítra závod — čas spát!',
    'Jdi spát! Minimum 8.5 hodin spánku pro maximální výkon.',
    'race-eve-sleep',
  );
}

// ── Race Day notifikace ───────────────────────────────────
export function notifyRaceBreakfastTime(): void {
  sendNotification(
    '⏰ Čas snídaně!',
    '3 hodiny do startu — snídaně 700–800 kcal (ovesná kaše + vejce + banán + med).',
    'race-breakfast',
  );
}

export function notifyRaceOnBikeFuel(): void {
  sendNotification(
    '🍌 Čas jíst na kole!',
    'Sněz něco! Cíl: 60–80 g sacharidů/h. Rice cake nebo gel.',
    'on-bike-fuel',
  );
}

// ── Post Race notifikace ──────────────────────────────────
export function notifyPostRaceRecovery(): void {
  sendNotification(
    '🎉 Závod dokončen!',
    'Ihned: Restart Drink + banán (300–400 kcal). Do 60 min pasta nebo rýže + protein.',
    'post-race-recovery',
  );
}

export function notifyNextDayRecovery(proteinTargetG: number): void {
  sendNotification(
    '🔄 Regenerace pokračuje',
    `Dnes: protein 2.0 g/kg = ${Math.round(proteinTargetG)} g. Žádný trénink!`,
    'post-race-next-day',
  );
}

// ── Scheduler pro celý den (volá se při přihlášení nebo změně fáze) ──
// Naplánuje notifikace relevantní pro aktuální den

interface SchedulerConfig {
  phase: TrainingPhase;
  raceStartHour?: number;   // hodina startu závodu (0–23)
  raceStartMinute?: number; // minuta startu závodu
  weightKg?: number;
  currentCarbsG?: number;
  targetCarbsG?: number;
  targetProteinG?: number;
  avgKcalWeekly?: number;
  weightTrend?: string;
  daysToRace?: number | null;
}

// Vrací pole timeoutId pro možné zrušení
export function scheduleDayNotifications(config: SchedulerConfig): ReturnType<typeof setTimeout>[] {
  if (!canNotify()) return [];
  const ids: ReturnType<typeof setTimeout>[] = [];
  const now = new Date();

  function msUntil(hour: number, minute = 0): number {
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
    if (target.getTime() <= now.getTime()) return -1; // čas už uplynul
    return target.getTime() - now.getTime();
  }

  switch (config.phase) {
    case 'off_season': {
      // Týdenní souhrn v neděli v 18:00
      if (now.getDay() === 0) {
        const delay = msUntil(18, 0);
        if (delay > 0 && config.avgKcalWeekly && config.weightTrend) {
          ids.push(scheduleNotification(delay, '📊 Týdenní souhrn výživy',
            `Průměr ${Math.round(config.avgKcalWeekly)} kcal · Váhový trend: ${config.weightTrend}`,
            'weekly-summary'));
        }
      }
      break;
    }

    case 'build_1':
    case 'build_2':
    case 'pre_race': {
      // Sacharidy připomínka ve 20:00 pokud je splnění pod 80 %
      const delay20 = msUntil(20, 0);
      if (delay20 > 0 && config.currentCarbsG != null && config.targetCarbsG) {
        const ratio = config.currentCarbsG / config.targetCarbsG;
        if (ratio < 0.8) {
          const missing = config.targetCarbsG - config.currentCarbsG;
          ids.push(scheduleNotification(delay20, '🚴 Ještě potřebuješ sacharidy!',
            `Do cíle zbývá ${Math.round(missing)} g sacharidů. Doplň to večeří.`,
            'carbs-reminder'));
        }
      }
      break;
    }

    case 'race_week': {
      if (config.daysToRace != null && config.daysToRace <= 2 && config.daysToRace >= 1) {
        // Carb-loading každé 2h (8:00–20:00)
        for (let h = 8; h <= 20; h += 2) {
          const delay = msUntil(h, 0);
          if (delay > 0 && config.currentCarbsG != null && config.targetCarbsG) {
            ids.push(scheduleNotification(delay, '🍝 Carb-loading update',
              `Sacharidy: ${Math.round(config.currentCarbsG)} g z ${Math.round(config.targetCarbsG)} g`,
              'carb-loading'));
          }
        }
        // Den před závodem v 21:00 — jdi spát
        if (config.daysToRace === 1) {
          const delaySleep = msUntil(21, 0);
          if (delaySleep > 0) {
            ids.push(scheduleNotification(delaySleep, '🏁 Zítra závod — čas spát!',
              'Jdi spát! Minimum 8.5 hodin spánku pro maximální výkon.',
              'race-eve-sleep'));
          }
        }
      }
      break;
    }

    case 'race_day': {
      const startH = config.raceStartHour ?? 10;
      const startM = config.raceStartMinute ?? 0;
      const raceStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM).getTime();

      // Snídaně –3h
      const breakfastMs = raceStartMs - 3 * 60 * 60 * 1000 - now.getTime();
      if (breakfastMs > 0) ids.push(scheduleNotification(breakfastMs, '⏰ Čas snídaně!',
        '3 hodiny do startu — snídaně 700–800 kcal (ovesná kaše + vejce + banán + med).', 'race-breakfast'));

      // –1h banán + ionťák
      const preRaceMs = raceStartMs - 1 * 60 * 60 * 1000 - now.getTime();
      if (preRaceMs > 0) ids.push(scheduleNotification(preRaceMs, '🍌 Připrav se na závod!',
        'Banán + 500 ml izotoniku. Za hodinu start!', 'pre-race-snack'));

      // On-bike: každých 45 min po startu (max 8h)
      for (let i = 1; i <= 10; i++) {
        const onBikeMs = raceStartMs + i * 45 * 60 * 1000 - now.getTime();
        if (onBikeMs > 0) {
          ids.push(scheduleNotification(onBikeMs, '🍌 Sněz něco na kole!',
            'Cíl: 60–80 g sacharidů/h. Rice cake nebo gel.', `on-bike-${i}`));
        }
      }
      break;
    }

    default:
      break;
  }

  return ids;
}

// ── Zrušení naplánovaných notifikací ─────────────────────
export function cancelScheduledNotifications(ids: ReturnType<typeof setTimeout>[]): void {
  ids.forEach(id => clearTimeout(id));
}
