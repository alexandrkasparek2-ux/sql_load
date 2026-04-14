import pino from 'pino';

/**
 * Shared pino logger. Defaults to single-line JSON for ingestion by Fly/Railway
 * log collectors; set LOG_PRETTY=true for human-readable dev output.
 */
const usePretty = process.env.LOG_PRETTY === 'true';

export const logger = pino(
  usePretty
    ? {
        level: process.env.LOG_LEVEL || 'info',
        transport: {
          target: 'pino/file',
          options: { destination: 1, colorize: true },
        },
      }
    : {
        level: process.env.LOG_LEVEL || 'info',
        base: { svc: 'cycling-coach-bot' },
      }
);

export function child(ctx: Record<string, unknown>) {
  return logger.child(ctx);
}
