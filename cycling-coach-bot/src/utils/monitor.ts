import { Telegraf } from 'telegraf';
import {
  listMonitoredUsers,
  logAlert,
  wasAlertSentRecently,
  db,
} from '../db/schema.js';
import { fetchAllData } from './aggregateData.js';
import { logger } from './logger.js';

const ALERT_DEDUP_SECONDS = 24 * 3600;

/**
 * Count how many of the most recent `days` days had a WHOOP recovery below
 * the given threshold, based on conversation context / cached data. For the
 * MVP we look at the last N alerts of the same key as a crude proxy.
 */
function consecutiveLowRecoveryDays(userId: number, days: number): number {
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  const rows = db
    .prepare(
      `SELECT COUNT(*) AS n FROM alert_log
       WHERE user_id = ? AND alert_key = 'whoop_low' AND created_at > ?`
    )
    .get(userId, cutoff) as { n: number };
  return rows.n;
}

export async function checkAthleteHealth(bot: Telegraf): Promise<void> {
  const users = listMonitoredUsers();
  for (const user of users) {
    try {
      const data = await fetchAllData(user.id);

      if (
        !('unavailable' in data.whoop) &&
        data.whoop.today.recovery_score < 30
      ) {
        logAlert(user.id, 'whoop_low');
        const streak = consecutiveLowRecoveryDays(user.id, 4);
        if (
          streak >= 3 &&
          !wasAlertSentRecently(user.id, 'whoop_red_streak', ALERT_DEDUP_SECONDS)
        ) {
          await bot.telegram.sendMessage(
            user.telegram_id,
            '⚠️ WHOOP recovery has been red for 3+ days. Consider a rest day.'
          );
          logAlert(user.id, 'whoop_red_streak');
        }
      }

      if (
        !('unavailable' in data.trainingpeaks) &&
        data.trainingpeaks.tsb < -30 &&
        !wasAlertSentRecently(user.id, 'tsb_deep', ALERT_DEDUP_SECONDS)
      ) {
        await bot.telegram.sendMessage(
          user.telegram_id,
          `📉 High fatigue detected (TSB ${data.trainingpeaks.tsb.toFixed(
            1
          )}). Consider recovery.`
        );
        logAlert(user.id, 'tsb_deep');
      }
    } catch (err) {
      logger.error({ userId: user.id, err: String(err) }, 'monitor user failed');
    }
  }
}

export function startMonitoring(bot: Telegraf): void {
  if (process.env.ENABLE_PROACTIVE_MONITORING !== 'true') return;
  const hours = Number(process.env.MONITORING_INTERVAL_HOURS || 6);
  const intervalMs = hours * 3600 * 1000;
  logger.info({ intervalHours: hours }, 'monitor starting');
  setInterval(() => {
    checkAthleteHealth(bot).catch((e) =>
      logger.error({ err: String(e) }, 'monitor tick failed')
    );
  }, intervalMs);
}
